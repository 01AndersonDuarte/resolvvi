import { useEffect } from 'react';
import type { SummaryReadState, SummaryRequestRuntime } from './summary-view-state';

export function useSummaryInitialRead(requests: SummaryRequestRuntime, readState: SummaryReadState): void {
  const { identity: identityRef, controllers: controllersRef } = requests;
  useEffect(() => {
    identityRef.current += 1;
    const currentIdentity = identityRef.current;
    const activeControllers = controllersRef.current;
    const initialRead = window.setTimeout(() => void readState(), 0);
    return () => {
      window.clearTimeout(initialRead);
      if (identityRef.current === currentIdentity) identityRef.current += 1;
      abortRequests(activeControllers);
    };
  }, [controllersRef, identityRef, readState]);
}

function abortRequests(controllers: Set<AbortController>): void {
  controllers.forEach((controller) => controller.abort());
  controllers.clear();
}
