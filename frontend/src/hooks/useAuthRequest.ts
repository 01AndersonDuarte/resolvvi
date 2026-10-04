import { useRequest } from './useRequest';
import { useSession } from './useSession';

type AuthTask<TInput, TOutput> = (input: TInput, signal: AbortSignal) => Promise<TOutput>;
type AuthRequestOptions = { onTimeout?: () => void };

export function useAuthRequest<TInput, TOutput>(task: AuthTask<TInput, TOutput>, options: AuthRequestOptions = {}) {
  const { state, invalidate } = useSession();

  return useRequest(task, {
    generation: state.generation,
    invalidateSession: invalidate,
    onTimeout: options.onTimeout,
  });
}
