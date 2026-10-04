import './config/envs.js';

import express from 'express';
import { createServer, type Server } from 'node:http';
import { prisma } from './config/database.js';
import { createHttpServer } from './server.js';
import type { VerificationEmailInput, VerificationSender } from './types/resend.js';

type CapturedMessage = Pick<VerificationEmailInput, 'email' | 'confirmationUrl' | 'expiresAt'>;
const messages: CapturedMessage[] = [];

function assertIsolatedTestEnvironment(): void {
  if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_LABEL?.endsWith('_test')) {
    throw new Error('The E2E harness requires NODE_ENV=test and an isolated test database.');
  }
}

function createMailboxServer(): Server {
  const app = express();
  app.use(express.json({ limit: '2kb' }));
  app.get('/mail', (request, response) => {
    const email = typeof request.query.email === 'string' ? request.query.email : '';
    const message = [...messages].reverse().find((entry) => entry.email === email);
    if (!message) return response.status(404).json({ error: 'Message not found' });
    return response.json({ ...message, expiresAt: message.expiresAt.toISOString() });
  });
  app.post('/expire-verification', async (request, response) => {
    const email = readEmail(request.body);
    if (!email) return response.status(400).end();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return response.status(404).end();
    await prisma.emailVerification.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { expiresAt: new Date(0), issuedAt: new Date(Date.now() - 61_000) },
    });
    return response.status(204).end();
  });
  app.post('/expire-session', async (request, response) => {
    const email = readEmail(request.body);
    if (!email) return response.status(400).end();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return response.status(404).end();
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
    return response.status(204).end();
  });
  return createServer(app);
}

function readEmail(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('email' in body) || typeof body.email !== 'string') {
    return null;
  }
  return body.email;
}

function createCaptureSender(): VerificationSender {
  return {
    send: (input) => {
      messages.push({ email: input.email, confirmationUrl: input.confirmationUrl, expiresAt: input.expiresAt });
      return Promise.resolve({ status: 'accepted', providerMessageId: `e2e-${input.emissionId}` });
    },
  };
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function close(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function startHarness(): Promise<void> {
  assertIsolatedTestEnvironment();
  const apiPort = Number(process.env.PORT);
  const mailboxPort = Number(process.env.E2E_MAILBOX_PORT);
  const apiServer = createHttpServer(process.env, createCaptureSender());
  const mailboxServer = createMailboxServer();
  await listen(mailboxServer, mailboxPort);
  await listen(apiServer, apiPort);
  const shutdown = async (): Promise<void> => {
    await Promise.all([close(apiServer), close(mailboxServer)]);
    await prisma.$disconnect();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}

void startHarness();
