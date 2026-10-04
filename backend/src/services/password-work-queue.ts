const MAX_ACTIVE_DERIVATIONS = 2;
const MAX_QUEUED_DERIVATIONS = 16;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export class PasswordWorkloadError extends Error {
  constructor() {
    super('A autenticação está temporariamente indisponível. Tente novamente.');
    this.name = 'PasswordWorkloadError';
  }
}

type WaitingJob = {
  resolve: () => void;
  timer: NodeJS.Timeout;
};

export type PasswordWorkQueue = {
  run<T>(operation: () => Promise<T>, deadlineAt?: number): Promise<T>;
};

export function createPasswordWorkQueue(): PasswordWorkQueue {
  let activeDerivations = 0;
  const waitingJobs: WaitingJob[] = [];

  async function run<T>(operation: () => Promise<T>, deadlineAt = Date.now() + DEFAULT_REQUEST_TIMEOUT_MS): Promise<T> {
    if (activeDerivations >= MAX_ACTIVE_DERIVATIONS) await waitForCapacity(waitingJobs, deadlineAt);

    activeDerivations += 1;
    try {
      return await operation();
    } finally {
      activeDerivations -= 1;
      waitingJobs.shift()?.resolve();
    }
  }

  return { run };
}

function waitForCapacity(jobs: WaitingJob[], deadlineAt: number): Promise<void> {
  if (jobs.length >= MAX_QUEUED_DERIVATIONS) return Promise.reject(new PasswordWorkloadError());

  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) return Promise.reject(new PasswordWorkloadError());

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const index = jobs.findIndex((job) => job.timer === timer);
      if (index !== -1) jobs.splice(index, 1);
      reject(new PasswordWorkloadError());
    }, remainingMs);
    jobs.push({
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      timer,
    });
  });
}
