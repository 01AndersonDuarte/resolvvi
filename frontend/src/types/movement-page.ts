import type { Movement } from './movement';

export const MOVEMENT_PAGE_SIZE = 20 as const;

export type MovementPage = {
  processId: number;
  items: Movement[];
  page: number;
  pageSize: typeof MOVEMENT_PAGE_SIZE;
  total: number;
  totalPages: number;
};
