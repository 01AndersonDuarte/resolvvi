import { ApplicationError, invalidInput } from '../errors/application-error.js';
import { Prisma } from '../generated/prisma/client.js';
import type { AuthenticationUser } from '../protocols.js';
import type { UserRepository } from '../repositories/user-repository.js';
import type { VerificationRepository } from '../repositories/verification-repository.js';
import { validateAndNormalizeEmail } from '../schemas/email-schema.js';
import { validatePassword } from '../schemas/password-schema.js';
import { createSecret, digestSecret } from './token-service.js';
import { hashPassword } from './password-service.js';
import type { VerificationSender } from './resend-service.js';

const REGISTRATION_MESSAGE = 'Confira seu e-mail para continuar. Se já possui conta confirmada, entre.';
const RESEND_MESSAGE = 'Se houver confirmação pendente para este e-mail, enviaremos as instruções.';
const REQUEST_TIMEOUT_MS = 12_000;

export type MessageResponse = { message: string };

export type AuthService = {
  register: (input: { email: string; password: string }) => Promise<MessageResponse>;
  resend: (input: { email: string }) => Promise<MessageResponse>;
};

type AuthDependencies = {
  publicAppUrl: string;
  users: UserRepository;
  verifications: VerificationRepository;
  sender: VerificationSender;
  now?: () => Date;
};

export function createAuthService(dependencies: AuthDependencies): AuthService {
  const now = dependencies.now ?? (() => new Date());
  return {
    register: (input) => registerAccount(input, dependencies, now),
    resend: (input) => resendConfirmation(input, dependencies, now),
  };
}

async function registerAccount(
  input: { email: string; password: string }, dependencies: AuthDependencies, now: () => Date,
): Promise<MessageResponse> {
  const email = normalizeEmail(input.email);
  assertPassword(input.password);
  try {
    const existingUser = await dependencies.users.findByEmail(email);
    const user = existingUser ?? await createOrReadUser(dependencies.users, email, input.password);
    if (user.emailVerifiedAt) return { message: REGISTRATION_MESSAGE };
    await issueVerification({ dependencies, userId: user.id, email, requestTime: now() });
    return { message: REGISTRATION_MESSAGE };
  } catch (error: unknown) {
    throw mapServiceFailure(error);
  }
}

async function createOrReadUser(
  users: UserRepository,
  email: string,
  password: string,
): Promise<AuthenticationUser> {
  const passwordHash = await hashPassword(password, Date.now() + REQUEST_TIMEOUT_MS);
  try {
    return await users.create({ email, passwordHash });
  } catch (error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const existingUser = await users.findByEmail(email);
    if (!existingUser) throw error;
    return existingUser;
  }
}

async function issueVerification(input: {
  dependencies: AuthDependencies;
  userId: string;
  email: string;
  requestTime: Date;
}): Promise<void> {
  const token = createSecret();
  const reservation = await input.dependencies.verifications.reserve({
    userId: input.userId, tokenHash: digestSecret(token),
  });
  if (reservation.status === 'confirmed') return;
  if (reservation.status === 'limited') throw createRateLimitError(reservation.retryAfterSeconds);

  const delivery = await input.dependencies.sender.send({
    emissionId: reservation.emission.id,
    email: input.email,
    confirmationUrl: `${input.dependencies.publicAppUrl}/confirmar-email#token=${token}`,
    expiresAt: reservation.emission.expiresAt,
    deadline: new Date(input.requestTime.getTime() + REQUEST_TIMEOUT_MS),
  });
  await persistDelivery(input.dependencies.verifications, reservation.emission.id, delivery);
  if (delivery.status === 'failed') throw createFailedDeliveryError();
  if (delivery.status === 'unknown') throw createUnknownDeliveryError();
}

async function persistDelivery(
  repository: VerificationRepository,
  emissionId: string,
  delivery: Awaited<ReturnType<VerificationSender['send']>>,
): Promise<void> {
  if (delivery.status === 'unknown') return;
  await repository.updateDelivery(
    emissionId,
    delivery.status === 'accepted' ? 'ACCEPTED' : 'FAILED',
    delivery.providerMessageId,
  );
}

function createRateLimitError(retryAfterSeconds: number): ApplicationError {
  return new ApplicationError({
    code: 'VERIFICATION_RATE_LIMITED', message: 'Aguarde para solicitar outro e-mail.',
    status: 429, retryAfterSeconds,
  });
}

function createFailedDeliveryError(): ApplicationError {
  return new ApplicationError({
    code: 'CONFIRMATION_SEND_FAILED',
    message: 'Não foi possível enviar a confirmação agora. Tente reenviar.',
    status: 502,
  });
}

function createUnknownDeliveryError(): ApplicationError {
  return new ApplicationError({
    code: 'CONFIRMATION_SEND_UNKNOWN',
    message: 'Não foi possível confirmar o envio. Confira seu e-mail; se a mensagem não chegar, tente reenviar.',
    status: 504,
  });
}

async function resendConfirmation(
  input: { email: string }, dependencies: AuthDependencies, now: () => Date,
): Promise<MessageResponse> {
  const email = normalizeEmail(input.email);
  try {
    const user = await dependencies.users.findByEmail(email);
    if (!user || user.emailVerifiedAt) return { message: RESEND_MESSAGE };
    await issueVerification({ dependencies, userId: user.id, email, requestTime: now() });
    return { message: RESEND_MESSAGE };
  } catch (error: unknown) {
    throw mapServiceFailure(error);
  }
}

function mapServiceFailure(error: unknown): Error {
  if (error instanceof ApplicationError) return error;
  return new ApplicationError({
    code: 'SERVICE_UNAVAILABLE',
    message: 'Não foi possível concluir o cadastro agora. Tente novamente.',
    status: 503,
  });
}

function normalizeEmail(email: string): string {
  const result = validateAndNormalizeEmail(email);
  if (!result.valid) throw invalidInput('Informe um e-mail válido.', 'email');
  return result.normalizedEmail;
}

function assertPassword(password: string): void {
  if (!validatePassword(password).valid) throw invalidInput('Use uma senha de 8 a 128 caracteres.', 'password');
}
