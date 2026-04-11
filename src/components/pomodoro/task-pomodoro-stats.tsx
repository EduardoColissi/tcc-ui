'use client';

import { Clock, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePomodoroStats, useSessions } from '@/hooks/use-pomodoro';

interface Props {
  taskId: number;
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m} min`;
  return `< 1 min`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TaskPomodoroStats({ taskId }: Props) {
  const { data: stats, isLoading: statsLoading } = usePomodoroStats(taskId);
  const { data: sessions = [], isLoading: sessionsLoading } = useSessions(taskId);

  const focusSessions = sessions.filter((s) => s.type === 'FOCUS' && s.completed);
  const recentSessions = sessions.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <Clock size={16} className="mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-bold">
            {statsLoading ? '—' : formatSeconds(stats?.totalFocusSeconds ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">Tempo de foco</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <Target size={16} className="mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-bold">
            {statsLoading ? '—' : (stats?.totalFocusSessions ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">Ciclos concluídos</p>
        </div>
      </div>

      {/* Session history */}
      {sessionsLoading && (
        <p className="text-xs text-muted-foreground">Carregando histórico...</p>
      )}

      {!sessionsLoading && recentSessions.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum ciclo registrado ainda.</p>
      )}

      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Histórico recente
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={s.type === 'FOCUS' ? 'default' : 'secondary'}
                    className="text-xs h-5 px-1.5"
                  >
                    {s.type === 'FOCUS' ? '🍅 Foco' : '☕ Pausa'}
                  </Badge>
                  <span className="text-muted-foreground">{formatDate(s.startedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.durationSeconds ? (
                    <span className="font-medium">{formatSeconds(s.durationSeconds)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {s.completed ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-muted-foreground" title="Interrompido">✕</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
