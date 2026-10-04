import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRepository, CreateUserInput } from '../types/auth.js';
import { createAuthService } from './auth-service.js';

const repository = {
  createUser: vi.fn<(input: CreateUserInput) => Promise<{ id: string }>>(),
  findUserByEmail: vi.fn(),
};
const service = createAuthService({ repositories: repository as unknown as AuthRepository });

describe('cadastro de conta', registrationCases);

function registrationCases(): void {
  beforeEach(resetMocks);
  it('aceita endereço sintaticamente válido sem verificar se existe', acceptsSyntacticEmail);
  it.each([
    [{ email: 'nao-e-email', password: 'senha valida' }, 'email'],
    [{ email: 'pessoa@example.com', password: 'curta' }, 'password'],
  ] as const)('recusa dados inválidos antes de persistir (%s)', rejectsInvalidInput);
  it('recusa e-mail já cadastrado sem substituir sua senha', rejectsDuplicateEmail);
  it('mapeia falha de persistência sem expor detalhes internos', hidesPersistenceFailure);
}

function resetMocks(): void {
  vi.resetAllMocks();
  repository.findUserByEmail.mockResolvedValue(null);
  repository.createUser.mockResolvedValue({ id: 'user-1' });
}

async function acceptsSyntacticEmail(): Promise<void> {
  await expect(service.register({ email: ' Pessoa@Example.COM ', password: ' senha válida ' }))
    .resolves.toEqual({ message: 'Conta criada. Entre com seu e-mail e senha.' });
  expect(repository.createUser).toHaveBeenCalledOnce();
  const createdInput = vi.mocked(repository.createUser).mock.calls[0]?.[0];
  expect(createdInput?.email).toBe('pessoa@example.com');
  expect(createdInput?.passwordHash).not.toBe(' senha válida ');
}

async function rejectsInvalidInput(input: { email: string; password: string }, field: string): Promise<void> {
  await expect(service.register(input)).rejects.toMatchObject({ status: 400, field });
  expect(repository.createUser).not.toHaveBeenCalled();
}

async function rejectsDuplicateEmail(): Promise<void> {
  repository.findUserByEmail.mockResolvedValue({ id: 'user-1' });
  await expect(service.register({ email: 'pessoa@example.com', password: 'senha diferente' }))
    .rejects.toMatchObject({ code: 'ACCOUNT_ALREADY_EXISTS', status: 409 });
  expect(repository.createUser).not.toHaveBeenCalled();
}

async function hidesPersistenceFailure(): Promise<void> {
  repository.createUser.mockRejectedValue(new Error('database details'));
  await expect(service.register({ email: 'pessoa@example.com', password: 'senha valida' }))
    .rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', status: 503 });
}
