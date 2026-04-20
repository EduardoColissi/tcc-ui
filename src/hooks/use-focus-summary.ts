import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { FocusEventType } from '@/lib/focus-monitor/types';

export interface FocusSummary {
  sessionId: number;
  total: number;
  byType: Partial<Record<FocusEventType, { count: number; totalDurationMs: number }>>;
}

export function useFocusSummary(sessionId: number | null) {
  return useQuery<FocusSummary>({
    queryKey: ['focus-summary', sessionId],
    enabled: sessionId !== null,
    queryFn: async () => {
      const { data } = await api.get(`/pomodoro/sessions/${sessionId}/focus-summary`);
      return data.data;
    },
  });
}
