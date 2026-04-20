'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  History,
  Target,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  ChevronRight,
} from 'lucide-react';
import { useFocusHistory, type FocusHistoryItem } from '@/hooks/use-focus-history';
import { FOCUS_EVENT_LABELS } from '@/lib/focus-monitor/labels';
import type { FocusEventType } from '@/lib/focus-monitor/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function formatMinutes(seconds: number | null | undefined) {
  if (!seconds) return '0 min';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}min`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function distractionTone(count: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (count === 0)
    return { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', label: 'Excelente' };
  if (count <= 2)
    return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Bom' };
  if (count <= 5)
    return { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Atenção' };
  return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Alto' };
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
          <Icon size={12} />
          <span>{label}</span>
        </div>
        <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SessionCard({ session }: { session: FocusHistoryItem }) {
  const totalDistractions = session.focusSummary.total;
  const tone = distractionTone(totalDistractions);
  const entries = (Object.entries(session.focusSummary.byType) as [
    FocusEventType,
    { count: number; totalDurationMs: number },
  ][]).filter(([, v]) => v.count > 0);

  return (
    <Card>
      <CardContent className="py-3 px-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatDateTime(session.startedAt)}
              </p>
              {session.monitoringEnabled ? (
                <Badge variant="outline" className="h-4 text-[10px] gap-0.5 px-1">
                  <Eye size={9} />
                  Monitorado
                </Badge>
              ) : (
                <Badge variant="outline" className="h-4 text-[10px] gap-0.5 px-1 text-muted-foreground">
                  <EyeOff size={9} />
                  Sem monitoramento
                </Badge>
              )}
              {!session.completed && (
                <Badge variant="outline" className="h-4 text-[10px] px-1 text-muted-foreground">
                  Interrompida
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium truncate">
              {session.task?.title ?? 'Tarefa removida'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {formatMinutes(session.durationSeconds)} de foco
            </p>
          </div>
          {session.monitoringEnabled && (
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-md px-3 py-1.5 shrink-0',
                tone.bg,
              )}
            >
              <span className={cn('text-lg font-bold tabular-nums leading-none', tone.text)}>
                {totalDistractions}
              </span>
              <span className={cn('text-[9px] uppercase tracking-wider mt-0.5', tone.text)}>
                {totalDistractions === 1 ? 'distração' : 'distrações'}
              </span>
            </div>
          )}
        </div>

        {entries.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <ul className="space-y-1 text-xs">
              {entries.map(([type, { count, totalDurationMs }]) => (
                <li key={type} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate">
                    {FOCUS_EVENT_LABELS[type]}
                  </span>
                  <span className="tabular-nums font-medium shrink-0">
                    {count}× · {Math.round(totalDurationMs / 1000)}s
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function FocusHistoryPage() {
  const { data: sessions = [], isLoading, error } = useFocusHistory();

  const kpis = useMemo(() => {
    const monitored = sessions.filter((s) => s.monitoringEnabled);
    const totalSessions = sessions.length;
    const totalFocusSeconds = sessions.reduce(
      (acc, s) => acc + (s.durationSeconds ?? 0),
      0,
    );
    const totalDistractions = monitored.reduce(
      (acc, s) => acc + s.focusSummary.total,
      0,
    );
    const avgDistractions =
      monitored.length > 0 ? totalDistractions / monitored.length : 0;

    const byType = new Map<FocusEventType, number>();
    for (const s of monitored) {
      for (const [type, val] of Object.entries(s.focusSummary.byType)) {
        if (!val) continue;
        byType.set(
          type as FocusEventType,
          (byType.get(type as FocusEventType) ?? 0) + val.count,
        );
      }
    }
    const topDistraction =
      [...byType.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return {
      totalSessions,
      totalFocusSeconds,
      totalDistractions,
      avgDistractions,
      topDistraction,
      monitoredCount: monitored.length,
    };
  }, [sessions]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <History size={18} className="text-primary" />
          Histórico de Foco
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sessões passadas e distrações detectadas pelo monitoramento.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 px-5 text-sm text-destructive">
            Erro ao carregar o histórico. Tente novamente em alguns segundos.
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && sessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 px-6 flex flex-col items-center text-center gap-2">
            <History size={28} className="text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma sessão concluída ainda.</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Inicie uma sessão de foco na tela do Pomodoro para começar a registrar seu
              histórico.
            </p>
            <Link
              href="/pomodoro"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ir para o Pomodoro <ChevronRight size={12} />
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KpiCard
              icon={Target}
              label="Sessões"
              value={kpis.totalSessions.toString()}
              sub={`${kpis.monitoredCount} monitoradas`}
            />
            <KpiCard
              icon={Clock}
              label="Tempo focado"
              value={formatMinutes(kpis.totalFocusSeconds)}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Distrações"
              value={kpis.totalDistractions.toString()}
              sub={
                kpis.monitoredCount > 0
                  ? `${kpis.avgDistractions.toFixed(1)} / sessão`
                  : undefined
              }
            />
            <KpiCard
              icon={Eye}
              label="Mais comum"
              value={
                kpis.topDistraction
                  ? FOCUS_EVENT_LABELS[kpis.topDistraction[0]].split(' ').slice(0, 2).join(' ')
                  : '—'
              }
              sub={kpis.topDistraction ? `${kpis.topDistraction[1]}×` : undefined}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest px-1">
              Sessões
            </p>
            <div className="space-y-2">
              {sessions.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
