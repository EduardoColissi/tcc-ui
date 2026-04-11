import type { Task } from '@/types';

/**
 * Priority order (higher = shown first):
 *
 * 1. URGENT   PROFESSIONAL  — 8
 * 2. URGENT   PERSONAL      — 7  (above HIGH professional, never above URGENT professional)
 * 3. HIGH     PROFESSIONAL  — 6
 * 4. MEDIUM   PROFESSIONAL  — 5
 * 5. HIGH     PERSONAL      — 4  ("demais pessoais" below medium professional)
 * 6. MEDIUM   PERSONAL      — 3
 * 7. LOW      PROFESSIONAL  — 2
 * 8. LOW      PERSONAL      — 1
 */
const SORT_SCORE: Record<string, Record<string, number>> = {
  URGENT: { PROFESSIONAL: 8, PERSONAL: 7 },
  HIGH:   { PROFESSIONAL: 6, PERSONAL: 4 },
  MEDIUM: { PROFESSIONAL: 5, PERSONAL: 3 },
  LOW:    { PROFESSIONAL: 2, PERSONAL: 1 },
};

export function taskSortScore(task: Task): number {
  return SORT_SCORE[task.priority]?.[task.type] ?? 0;
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => taskSortScore(b) - taskSortScore(a));
}
