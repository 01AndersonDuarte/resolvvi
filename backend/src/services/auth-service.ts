import { ApplicationError, invalidInput } from '../errors/application-error.js';
import { Prisma } from '../generated/prisma/client.js';
import { validateAndNormalizeEmail, validatePassword } from '../schemas/auth-schema.js';
import type { AuthenticationUser, AuthService, AuthServiceDependencies, LoginInput, MessageResponse, RegistrationInput, SessionContext, SessionGrant } from '../types/auth.js';
import { createDummyPasswordHash, createSecret, digestSecret, hashPassword, isValidSecret, verifyPassword } from './security-service.js';

const REGISTRATION_MESSAGE = 'Conta criada. Entre com seu e-mail e senha.';
const REQUEST_TIMEOUT_MS = 12_000;
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos.';

export function createAuthService(dependencies: AuthServiceDependencies): AuthService {
  return {
    register: (input) => register(input, dependencies),
    login: (input, previousSecret = null) => login(input, previousSecret, dependencies),
    getSession: (secret) => getSession(secret, dependencies),
    logout: (secret) => logout(secret, dependencies),
  };
}

export async function register(input: RegistrationInput, dependencies: AuthServiceDependencies): Promise<MessageResponse> {
  const email = normalizeEmail(input.email);
  assertPassword(input.password);
  try {
    if (await dependencies.repositories.findUserByEmail(email)) throw accountAlreadyExists();
    const passwordHash = await hashPassword(input.password, Date.now() + REQUEST_TIMEOUT_MS);
    await dependencies.repositories.createUser({ email, passwordHash });
    return { message: REGISTRATION_MESSAGE };
  } catch (error: unknown) {
    if (isUniqueEmailConflict(error)) throw accountAlreadyExists();
    throw mapServiceFailure(error);
  }
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
  return { ...toSessionContext({ sessionId: session.id, userId: user.id, expiresAt, serverTime: now }), secret };
}

export async function getSession(secret: string | null, dependencies: AuthServiceDependencies): Promise<SessionContext> {
  if (!secret || !isValidSecret(secret)) throw sessionInvalid();
  try {
    const now = getCurrentTime(dependencies);
    const session = await dependencies.repositories.findValidSessionByTokenHash(digestSecret(secret), now);
    if (!session) throw sessionInvalid();
    return toSessionContext({ sessionId: session.id, userId: session.userId, expiresAt: session.expiresAt, serverTime: now });
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

function toSessionContext(input: { sessionId: string; userId: string; expiresAt: Date; serverTime: Date }): SessionContext {
  return {
    sessionId: input.sessionId,
    userId: input.userId,
    expiresAt: input.expiresAt.toISOString(),
    serverTime: input.serverTime.toISOString(),
  };
}

function accountAlreadyExists(): ApplicationError {
  return new ApplicationError({
    code: 'ACCOUNT_ALREADY_EXISTS',
    message: 'Já existe uma conta com esse e-mail. Entre com sua senha.',
    status: 409,
  });
}

function credentialsRejected(): ApplicationError {
  return new ApplicationError({ code: 'INVALID_CREDENTIALS', message: INVALID_CREDENTIALS_MESSAGE, status: 401 });
}

function sessionInvalid(): ApplicationError {
  return new ApplicationError({ code: 'SESSION_INVALID', message: 'Sua sessão não é mais válida.', status: 401 });
}

function serviceUnavailable(message = 'A autenticação está temporariamente indisponível. Tente novamente.'): ApplicationError {
  return new ApplicationError({ code: 'SERVICE_UNAVAILABLE', message, status: 503 });
}

function mapLoginFailure(error: unknown): Error {
  return error instanceof ApplicationError ? error : serviceUnavailable();
}

function mapSessionFailure(error: unknown): Error {
  return error instanceof ApplicationError ? error : serviceUnavailable();
}

function getCurrentTime(dependencies: AuthServiceDependencies): Date {
  return dependencies.now?.() ?? new Date();
}

function mapServiceFailure(error: unknown): Error {
  if (error instanceof ApplicationError) return error;
  return serviceUnavailable('Não foi possível concluir o cadastro agora. Tente novamente.');
}

function isUniqueEmailConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function normalizeEmail(email: string): string {
  const result = validateAndNormalizeEmail(email);
  if (!result.valid) throw invalidInput('Informe um e-mail válido.', 'email');
  return result.normalizedEmail;
}

function assertPassword(password: string): void {
  if (!validatePassword(password).valid) throw invalidInput('Use uma senha de 8 a 128 caracteres.', 'password');
}
