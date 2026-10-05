import { useCallback, useMemo, useRef } from 'react';
import type { SummaryRequest, SummaryRequestRuntime } from './summary-view-state';

const REQUEST_TIMEOUT_MS = 12_000;

export function useSummaryRequestRuntime(): SummaryRequestRuntime {
  const identity = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const startRequest = useCallback(() => startTrackedRequest(controllers.current), []);
  const finishRequest = useCallback((request: SummaryRequest) => finishTrackedRequest(request, controllers.current), []);

  return useMemo(() => ({ identity, controllers, startRequest, finishRequest }), [controllers, finishRequest, identity, startRequest]);
}

function startTrackedRequest(controllers: Set<AbortController>): SummaryRequest {
  const controller = new AbortController();
  controllers.add(controller);
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  return { controller, timeout, hasTimedOut: () => timedOut };
}

function finishTrackedRequest(request: SummaryRequest, controllers: Set<AbortController>): void {
  window.clearTimeout(request.timeout);
  controllers.delete(request.controller);
}
