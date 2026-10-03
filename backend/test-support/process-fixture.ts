import { spawn, type ChildProcess } from 'node:child_process';
import type { Readable } from 'node:stream';

export type ProcessResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
  stdout: string;
};

type RunProcessInput = {
  arguments?: string[];
  command: string;
  cwd: string;
  environment?: NodeJS.ProcessEnv;
};

async function collectOutput(stream: Readable): Promise<string> {
  const chunks: string[] = [];
  stream.setEncoding('utf8');
  for await (const chunk of stream) {
    chunks.push(String(chunk));
  }

  return chunks.join('');
}

function waitForExit(child: ChildProcess): Promise<Pick<ProcessResult, 'exitCode' | 'signal'>> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

export async function runProcess(input: RunProcessInput): Promise<ProcessResult> {
  const child = spawn(input.command, input.arguments ?? [], {
    cwd: input.cwd,
    env: { ...process.env, ...input.environment },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const [status, stderr, stdout] = await Promise.all([
    waitForExit(child),
    collectOutput(child.stderr),
    collectOutput(child.stdout),
  ]);

  return { ...status, stderr, stdout };
}
