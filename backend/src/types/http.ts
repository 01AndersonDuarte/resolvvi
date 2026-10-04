import type { RequestHandler } from 'express';
import type { Router } from 'express';

import type { AuthService } from './auth.js';
import type { MovementRepository, ProcessRepository } from './process.js';
import type { ProcessAiSummaryServiceContract } from './process-ai-summary.js';

export type AuthController = {
  register: RequestHandler;
  login: RequestHandler;
  session: RequestHandler;
  logout: RequestHandler;
};

export type SessionCookieConfiguration = { name: string; secure: boolean };

export type AppDependencies = {
  publicAppUrl: string;
  healthHandler?: RequestHandler;
  authRouter?: Router;
  processRouter?: Router;
  processAiSummaryRouter?: Router;
};

export type AuthRouterDependencies = { service: AuthService };
export type ProcessRouterDependencies = {
  authService: AuthService;
  processRepository: ProcessRepository;
  movementRepository: MovementRepository;
  cookie: SessionCookieConfiguration;
};
export type ProcessAiSummaryRouterDependencies = {
  authService: AuthService;
  service: ProcessAiSummaryServiceContract;
  cookie: SessionCookieConfiguration;
};
