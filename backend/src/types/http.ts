import type { RequestHandler } from 'express';
import type { Router } from 'express';

import type { AuthService } from './auth.js';

export type AuthController = {
  register: RequestHandler;
  resend: RequestHandler;
  confirm: RequestHandler;
  login: RequestHandler;
  session: RequestHandler;
  logout: RequestHandler;
};

export type SessionCookieConfiguration = { name: string; secure: boolean };

export type AppDependencies = {
  publicAppUrl: string;
  healthHandler?: RequestHandler;
  authRouter?: Router;
};

export type AuthRouterDependencies = { service: AuthService };
