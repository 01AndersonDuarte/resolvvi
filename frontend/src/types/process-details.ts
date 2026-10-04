import type { ProcessSummary } from './process-summary';

export type ProcessDetails = ProcessSummary & {
  forum: string | null;
  court: string | null;
  lawsuitValue: string | null;
  numberOfAuthors: number | null;
};
