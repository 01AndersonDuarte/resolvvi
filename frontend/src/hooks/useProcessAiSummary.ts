import { useCallback, useRef, useState } from 'react';
import { useSession } from './useSession';
import { useSummaryGeneration } from './useSummaryGeneration';
import { useSummaryInitialRead } from './useSummaryInitialRead';
import { useSummaryPolling } from './useSummaryPolling';
import { useSummaryRequestRuntime } from './useSummaryRequestRuntime';
import { useSummaryStateActions } from './useSummaryStateActions';
import { useSummaryStateReader } from './useSummaryStateReader';
import type { SummaryViewState } from './summary-view-state';

const INITIAL_STATE: SummaryViewState = { data: null, loading: true, generating: false, error: null };

export function useProcessAiSummary(processId: number) {
  const { invalidate } = useSession();
  const [view, setView] = useState<SummaryViewState>(INITIAL_STATE);
  const deadline = useRef<number | null>(null);
  const requests = useSummaryRequestRuntime();
  const actions = useSummaryStateActions(setView, invalidate, deadline);
  const readState = useSummaryStateReader({ processId, requests, setView, ...actions });
  useSummaryInitialRead(requests, readState);
  useSummaryPolling(view.data, deadline, readState, setView);
  const generate = useSummaryGeneration({ processId, view, requests, readState, setView, ...actions, invalidate });
  const refresh = useCallback(() => readState(), [readState]);

  return { ...view, generate, refresh, updateSummary: actions.updateSummary };
}
