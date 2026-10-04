import { ApplicationError, invalidInput } from '../errors/application-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { validateAndNormalizeEmail, validatePassword } from '../schemas/auth-schema.js';
import type { AuthenticationUser, AuthRepository, AuthService, AuthServiceDependencies, EmailInput, MessageResponse, RegistrationInput } from '../types/auth.js';
import type { DeliveryResult } from '../types/resend.js';
import { createSecret, digestSecret, hashPassword } from './security-service.js';

const REGISTRATION_MESSAGE = 'Confira seu e-mail para continuar. Se já possui conta confirmada, entre.';
const RESEND_MESSAGE = 'Se houver confirmação pendente para este e-mail, enviaremos as instruções.';
const REQUEST_TIMEOUT_MS = 12_000;

export function createAuthService(dependencies: AuthServiceDependencies): AuthService {
  return {
    register: (input) => register(input, dependencies),
    resend: (input) => resend(input, dependencies),
  };
}

export async function register(input: RegistrationInput, dependencies: AuthServiceDependencies): Promise<MessageResponse> {
  const email = normalizeEmail(input.email);
  assertPassword(input.password);
  try {
    const existingUser = await dependencies.repositories.findUserByEmail(email);
    const user = existingUser ?? await createOrReadUser(dependencies.repositories, email, input.password);
    if (user.emailVerifiedAt) return { message: REGISTRATION_MESSAGE };
    await issueVerification({ dependencies, userId: user.id, email, requestTime: getCurrentTime(dependencies) });
    return { message: REGISTRATION_MESSAGE };
  } catch (error: unknown) {
    throw mapServiceFailure(error);
  }
}

async function createOrReadUser(
  users: AuthServiceDependencies['repositories'],
  email: string,
  password: string,
): Promise<AuthenticationUser> {
  const passwordHash = await hashPassword(password, Date.now() + REQUEST_TIMEOUT_MS);
  try {
    return await users.createUser({ email, passwordHash });
  } catch (error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    const existingUser = await users.findUserByEmail(email);
    if (!existingUser) throw error;
    return existingUser;
  }
}

async function issueVerification(input: {
  dependencies: AuthServiceDependencies;
  userId: string;
  email: string;
  requestTime: Date;
}): Promise<void> {
  const token = createSecret();
  const reservation = await input.dependencies.repositories.reserveVerification({
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
  await persistDelivery(input.dependencies.repositories, reservation.emission.id, delivery);
  if (delivery.status === 'failed') throw createFailedDeliveryError();
  if (delivery.status === 'unknown') throw createUnknownDeliveryError();
}

async function persistDelivery(
  repository: AuthRepository,
  emissionId: string,
  delivery: DeliveryResult,
): Promise<void> {
  if (delivery.status === 'unknown') return;
  await repository.updateVerificationDelivery(
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

export async function resend(input: EmailInput, dependencies: AuthServiceDependencies): Promise<MessageResponse> {
  const email = normalizeEmail(input.email);
  try {
    const user = await dependencies.repositories.findUserByEmail(email);
    if (!user || user.emailVerifiedAt) return { message: RESEND_MESSAGE };
    await issueVerification({ dependencies, userId: user.id, email, requestTime: getCurrentTime(dependencies) });
    return { message: RESEND_MESSAGE };
  } catch (error: unknown) {
    throw mapServiceFailure(error);
  }
}

function getCurrentTime(dependencies: AuthServiceDependencies): Date {
  return dependencies.now?.() ?? new Date();
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
