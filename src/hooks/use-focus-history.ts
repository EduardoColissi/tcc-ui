import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { FocusEventType } from '@/lib/focus-monitor/types';

export interface FocusHistoryItem {
  id: number;
  taskId: number;
  type: 'FOCUS' | 'BREAK';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  completed: boolean;
  monitoringEnabled: boolean;
  task: { id: number; title: string } | null;
  focusSummary: {
    total: number;
    byType: Partial<Record<FocusEventType, { count: number; totalDurationMs: number }>>;
  };
}

export function useFocusHistory() {
  return useQuery<FocusHistoryItem[]>({
    queryKey: ['focus-history'],
    queryFn: async () => {
      const { data } = await api.get('/pomodoro/history');
      return data.data;
    },
  });
}
