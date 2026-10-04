import { describe, expect, it } from 'vitest';

import { PasswordWorkloadError, createPasswordWorkQueue } from './password-work-queue.js';

describe('password work queue capacity', () => {
  it('rejects work beyond two active derivations and sixteen queued jobs', async () => {
    const queue = createPasswordWorkQueue();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const jobs = Array.from({ length: 18 }, () => queue.run(() => gate));

    await expect(queue.run(() => Promise.resolve(undefined))).rejects.toBeInstanceOf(PasswordWorkloadError);
    release?.();
    await Promise.all(jobs);
  });

});

describe('password work queue deadlines', () => {
  it('rejects queued work after its deadline', async () => {
    const queue = createPasswordWorkQueue();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const active = queue.run(() => gate);
    const secondActive = queue.run(() => gate);
    const queued = queue.run(() => Promise.resolve(undefined), Date.now() - 1);

    await expect(queued).rejects.toBeInstanceOf(PasswordWorkloadError);
    release?.();
    await Promise.all([active, secondActive]);
  });

  it('removes work from the queue when its deadline elapses', async () => {
    const queue = createPasswordWorkQueue();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const active = [queue.run(() => gate), queue.run(() => gate)];
    const queued = queue.run(() => Promise.resolve(undefined), Date.now() + 5);

    await expect(queued).rejects.toBeInstanceOf(PasswordWorkloadError);
    release?.();
    await Promise.all(active);
  });
});
