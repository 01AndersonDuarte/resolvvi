import { ApplicationError, invalidInput } from '../errors/application-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { validateAndNormalizeEmail, validatePassword, verificationInvalid } from '../schemas/auth-schema.js';
import type { AuthenticationUser, AuthRepository, AuthService, AuthServiceDependencies, ConfirmationInput, EmailInput, LoginInput, MessageResponse, RegistrationInput, SessionContext, SessionGrant } from '../types/auth.js';
import type { DeliveryResult } from '../types/resend.js';
import { createDummyPasswordHash, createSecret, digestSecret, hashPassword, isValidSecret, verifyPassword } from './security-service.js';

const REGISTRATION_MESSAGE = 'Confira seu e-mail para continuar. Se já possui conta confirmada, entre.';
const RESEND_MESSAGE = 'Se houver confirmação pendente para este e-mail, enviaremos as instruções.';
const REQUEST_TIMEOUT_MS = 12_000;
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos.';

export function createAuthService(dependencies: AuthServiceDependencies): AuthService {
  return {
    register: (input) => register(input, dependencies),
    resend: (input) => resend(input, dependencies),
    confirm: (input) => confirm(input, dependencies),
    login: (input, previousSecret = null) => login(input, previousSecret, dependencies),
    getSession: (secret) => getSession(secret, dependencies),
    logout: (secret) => logout(secret, dependencies),
  };
}

export async function login(
  input: LoginInput,
  previousSecret: string | null,
  dependencies: AuthServiceDependencies,
): Promise<SessionGrant> {
  const email = normalizeEmail(input.email);
  try {
    const user = await dependencies.repositories.findUserByEmail(email);
    if (!user) {
      await createDummyPasswordHash(Date.now() + REQUEST_TIMEOUT_MS);
      throw credentialsRejected();
    }
    if (!await verifyPassword(input.password, user.passwordHash, Date.now() + REQUEST_TIMEOUT_MS)) {
      throw credentialsRejected();
    }
    if (!user.emailVerifiedAt) throw emailUnconfirmed();
    return await createSessionGrant(user, previousSecret, dependencies);
  } catch (error: unknown) {
    throw mapLoginFailure(error);
  }
}

async function createSessionGrant(
  user: AuthenticationUser,
  previousSecret: string | null,
  dependencies: AuthServiceDependencies,
): Promise<SessionGrant> {
  const now = getCurrentTime(dependencies);
  const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
  const secret = createSecret();
  const session = await dependencies.repositories.replaceSession(
    { userId: user.id, tokenHash: digestSecret(secret), expiresAt },
    previousSecret && isValidSecret(previousSecret) ? digestSecret(previousSecret) : null,
    now,
  );
  return { ...toSessionContext({
    sessionId: session.id, userId: user.id, expiresAt, serverTime: now, emailVerifiedAt: user.emailVerifiedAt!,
  }), secret };
}

export async function getSession(secret: string | null, dependencies: AuthServiceDependencies): Promise<SessionContext> {
  if (!secret || !isValidSecret(secret)) throw sessionInvalid();
  try {
    const now = getCurrentTime(dependencies);
    const session = await dependencies.repositories.findValidSessionByTokenHash(digestSecret(secret), now);
    if (!session) throw sessionInvalid();
    return toSessionContext({
      sessionId: session.id, userId: session.userId, expiresAt: session.expiresAt,
      serverTime: now, emailVerifiedAt: session.user.emailVerifiedAt!,
    });
  } catch (error: unknown) {
    throw mapSessionFailure(error);
  }
}

export async function logout(secret: string | null, dependencies: AuthServiceDependencies): Promise<void> {
  if (!secret || !isValidSecret(secret)) return;
  try {
    await dependencies.repositories.revokeSessionByTokenHash(digestSecret(secret), getCurrentTime(dependencies));
  } catch {
    throw serviceUnavailable('Não foi possível concluir a saída agora. Tente novamente.');
  }
}

function toSessionContext(input: {
  sessionId: string; userId: string; expiresAt: Date; serverTime: Date; emailVerifiedAt: Date;
}): SessionContext {
  return {
    sessionId: input.sessionId,
    userId: input.userId,
    expiresAt: input.expiresAt.toISOString(),
    serverTime: input.serverTime.toISOString(),
    emailVerifiedAt: input.emailVerifiedAt,
  };
}

function credentialsRejected(): ApplicationError {
  return new ApplicationError({ code: 'INVALID_CREDENTIALS', message: INVALID_CREDENTIALS_MESSAGE, status: 401 });
}

function emailUnconfirmed(): ApplicationError {
  return new ApplicationError({
    code: 'EMAIL_UNCONFIRMED', message: 'Confirme seu e-mail antes de entrar.', status: 403,
  });
}

function sessionInvalid(): ApplicationError {
  return new ApplicationError({ code: 'SESSION_INVALID', message: 'Sua sessão não é mais válida.', status: 401 });
}

function serviceUnavailable(message = 'A autenticação está temporariamente indisponível. Tente novamente.'): ApplicationError {
  return new ApplicationError({ code: 'SERVICE_UNAVAILABLE', message, status: 503 });
}

function mapLoginFailure(error: unknown): Error {
  if (error instanceof ApplicationError) return error;
  return serviceUnavailable();
}

function mapSessionFailure(error: unknown): Error {
  if (error instanceof ApplicationError) return error;
  return serviceUnavailable();
}

export async function confirm(input: ConfirmationInput, dependencies: AuthServiceDependencies): Promise<MessageResponse> {
  if (!isCanonicalVerificationToken(input.token)) throw verificationInvalid();

  try {
    const deadline = new Date(Date.now() + REQUEST_TIMEOUT_MS);
    const confirmed = await dependencies.repositories.consumeVerification(digestSecret(input.token), deadline);
    if (!confirmed) throw verificationInvalid();
    return { message: 'E-mail confirmado. Agora você pode entrar.' };
  } catch (error: unknown) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Não foi possível concluir a confirmação agora. Abra o link novamente ou tente entrar se já confirmou seu e-mail.',
      status: 503,
    });
  }
}

function isCanonicalVerificationToken(token: string): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const decoded = Buffer.from(token, 'base64url');
  return decoded.length === 32 && decoded.toString('base64url') === token;
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
  }, new Date(input.requestTime.getTime() + REQUEST_TIMEOUT_MS));
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
