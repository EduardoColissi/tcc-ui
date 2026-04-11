import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ActiveSession, PomodoroSession, PomodoroStats } from '@/types';

export function useSessions(taskId?: number) {
  return useQuery<PomodoroSession[]>({
    queryKey: ['sessions', taskId],
    queryFn: async () => {
      const url = taskId ? `/pomodoro/sessions?taskId=${taskId}` : '/pomodoro/sessions';
      const { data } = await api.get(url);
      return data.data;
    },
    enabled: taskId !== undefined,
  });
}

export function useActiveSession() {
  return useQuery<ActiveSession | null>({
    queryKey: ['sessions', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/pomodoro/sessions/active');
      return data.data ?? null;
    },
    refetchInterval: false,
    staleTime: Infinity,
  });
}

export function usePomodoroStats(taskId: number) {
  return useQuery<PomodoroStats>({
    queryKey: ['pomodoro-stats', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/pomodoro/stats?taskId=${taskId}`);
      return data.data;
    },
    enabled: taskId > 0,
  });
}
