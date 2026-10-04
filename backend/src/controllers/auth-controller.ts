import type { RequestHandler } from 'express';

import { parseEmailInput } from '../schemas/email-input-schema.js';
import { parseRegistrationInput } from '../schemas/registration-schema.js';
import type { AuthService } from '../services/auth-service.js';

export type AuthController = {
  register: RequestHandler;
  resend: RequestHandler;
};

export function createAuthController(service: AuthService): AuthController {
  return {
    register: async (request, response) => {
      const input = parseRegistrationInput(request.body);
      const result = await service.register(input);
      response.status(202).json(result);
    },
    resend: async (request, response) => {
      const input = parseEmailInput(request.body);
      const result = await service.resend(input);
      response.status(202).json(result);
    },
  };
}
