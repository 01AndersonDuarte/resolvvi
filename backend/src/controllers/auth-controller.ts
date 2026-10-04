import type { EmailInput, RegistrationInput } from '../types/auth.js';
import type { AuthService } from '../types/auth.js';
import type { AuthController } from '../types/http.js';

export type { AuthController };

export function createAuthController(service: AuthService): AuthController {
  return {
    register: async (request, response) => {
      const input = request.body as RegistrationInput;
      const result = await service.register(input);
      response.status(202).json(result);
    },
    resend: async (request, response) => {
      const input = request.body as EmailInput;
      const result = await service.resend(input);
      response.status(202).json(result);
    },
  };
}
