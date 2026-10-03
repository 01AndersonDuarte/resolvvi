export function configurationError(fields: readonly string[]): Error {
  const invalidFields = [...new Set(fields)];
  const error = new Error(`Configuração inválida: ${invalidFields.join(', ')}.`);
  error.name = 'InvalidConfigurationError';

  return error;
}
