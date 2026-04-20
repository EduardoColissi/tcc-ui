'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTasks } from '@/hooks/use-tasks';
import { useFocusSummary } from '@/hooks/use-focus-summary';
import {
  CYCLES_BEFORE_LONG_BREAK,
  FOCUS_SECONDS,
  LONG_BREAK_SECONDS,
  SHORT_BREAK_SECONDS,
  usePomodoro,
} from '@/lib/pomodoro-store';
import { useFocusMonitor } from '@/lib/focus-monitor/use-focus-monitor';
import { FOCUS_EVENT_LABELS } from '@/lib/focus-monitor/labels';
import { playWarningBeep } from '@/lib/focus-monitor/beep';
import type { FocusEventType } from '@/lib/focus-monitor/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StartFocusDialog } from '@/components/pomodoro/start-focus-dialog';
import { Pause, Play, Square, ChevronDown, Eye, AlertTriangle, X, Video, Info } from 'lucide-react';
import { toastWarning } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

const PHASE_LABELS: Record<string, string> = {
  focus: 'Sessão de Foco',
  short_break: 'Pausa Curta',
  long_break: 'Pausa Longa',
  idle: 'Pronto para iniciar',
};

const PHASE_COLORS: Record<string, string> = {
  focus: 'text-primary',
  short_break: 'text-green-500',
  long_break: 'text-blue-500',
  idle: 'text-muted-foreground',
};

const PHASE_BG: Record<string, string> = {
  focus: 'stroke-primary',
  short_break: 'stroke-green-500',
  long_break: 'stroke-blue-500',
  idle: 'stroke-muted-foreground',
};

const priorityLabel: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente',
};
const priorityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'secondary', HIGH: 'default', URGENT: 'destructive',
};

function phaseTotal(phase: string) {
  if (phase === 'short_break') return SHORT_BREAK_SECONDS;
  if (phase === 'long_break') return LONG_BREAK_SECONDS;
  return FOCUS_SECONDS;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function PomodoroPage() {
  const searchParams = useSearchParams();
  const { data: tasks = [], isLoading } = useTasks();
  const {
    state,
    remaining,
    startFocus,
    pause,
    resume,
    stop,
    clearLastFocusSummary,
  } = usePomodoro();
  const [showSelector, setShowSelector] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);

  const handleWarning = useCallback((type: FocusEventType) => {
    toastWarning('Foco perdido', FOCUS_EVENT_LABELS[type]);
    playWarningBeep();
  }, []);

  const isPaused = state.pausedRemaining !== null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const focusMonitor = useFocusMonitor({
    sessionId: state.sessionId,
    enabled: state.monitoringEnabled && state.phase === 'focus' && !isPaused,
    onWarning: handleWarning,
    videoRef,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const det of focusMonitor.detections) {
      const [x1, y1, x2, y2] = det.bbox;
      const isPerson = det.classId === 0;
      const color = isPerson ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.font = 'bold 16px sans-serif';
      const label = `${isPerson ? 'Pessoa' : 'Celular'} ${det.score.toFixed(2)}`;
      const metrics = ctx.measureText(label);
      ctx.fillStyle = color;
      ctx.fillRect(x1, Math.max(0, y1 - 20), metrics.width + 8, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x1 + 4, Math.max(15, y1 - 5));
    }
  }, [focusMonitor.detections]);

  const totalDistractions = Object.values(focusMonitor.counts).reduce(
    (a, b) => a + b,
    0,
  );
  const focusSummary = useFocusSummary(state.lastFocusSessionId);

  const activeTasks = tasks.filter((t) => t.status !== 'DONE');

  // pendingTask: task pre-selected via URL but not yet started
  const [pendingTask, setPendingTask] = useState<Task | null>(null);

  // Pre-select task from ?taskId= without starting the session
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (!taskId || tasks.length === 0) return;
    if (state.phase !== 'idle') return; // don't override an active session
    const task = tasks.find((t) => t.id === Number(taskId));
    if (task) setPendingTask(task);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // The task shown in the selector: running task takes precedence over pending
  const displayTask = state.task ?? pendingTask;
  const phase = state.phase;
  const total = phaseTotal(phase);
  const progress = phase !== 'idle' ? ((total - remaining) / total) * 100 : 0;

  // SVG ring (large)
  const size = 240;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress / 100);

  function handleSelectTask(task: Task) {
    // Only pre-select; user clicks "Iniciar foco" to actually start
    setPendingTask(task);
    setShowSelector(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-2">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pomodoro</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Foque em uma tarefa por vez. 25 min de foco, 5 min de pausa.
        </p>
      </div>

      {/* Task selector */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Tarefa selecionada
        </p>
        {displayTask ? (
          <Card
            className={cn(
              'transition-colors',
              phase === 'idle' ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
            )}
            onClick={() => phase === 'idle' && setShowSelector((v) => !v)}
          >
            <CardContent className="flex items-center justify-between gap-3 py-3 px-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{displayTask.title}</p>
                <div className="flex gap-1.5 mt-1">
                  <Badge variant={priorityVariant[displayTask.priority]} className="text-xs h-4 px-1.5">
                    {priorityLabel[displayTask.priority]}
                  </Badge>
                  <Badge variant="outline" className="text-xs h-4 px-1.5">
                    {displayTask.type === 'PROFESSIONAL' ? 'Profissional' : 'Pessoal'}
                  </Badge>
                </div>
              </div>
              {phase === 'idle' && (
                <ChevronDown size={15} className={cn('text-muted-foreground shrink-0 transition-transform', showSelector && 'rotate-180')} />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card
            className="cursor-pointer border-dashed transition-colors hover:bg-accent/50"
            onClick={() => setShowSelector((v) => !v)}
          >
            <CardContent className="flex items-center justify-center gap-2 py-5 text-muted-foreground">
              <span className="text-sm">Selecione uma tarefa para começar</span>
              <ChevronDown size={15} className={cn('transition-transform', showSelector && 'rotate-180')} />
            </CardContent>
          </Card>
        )}

        {/* Dropdown task list */}
        {showSelector && (
          <Card className="shadow-md border-border/80">
            <CardContent className="p-1.5 space-y-0.5 max-h-56 overflow-y-auto">
              {isLoading && <p className="px-3 py-2 text-sm text-muted-foreground">Carregando...</p>}
              {!isLoading && activeTasks.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma tarefa ativa.</p>
              )}
              {activeTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent',
                    displayTask?.id === task.id && 'bg-primary/10 text-primary font-medium',
                  )}
                >
                  <span className="block truncate">{task.title}</span>
                  <span className={cn('text-xs', displayTask?.id === task.id ? 'text-primary/70' : 'text-muted-foreground')}>
                    {task.status === 'TODO' ? 'A Fazer' : 'Em Andamento'} · {priorityLabel[task.priority]}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main timer ring */}
      <div className="flex flex-col items-center gap-5">
        {/* Cycle progress dots */}
        <div className="flex items-center gap-2.5">
          {Array.from({ length: CYCLES_BEFORE_LONG_BREAK }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full transition-all duration-300',
                i < (state.completedCycles % CYCLES_BEFORE_LONG_BREAK)
                  ? 'h-2.5 w-2.5 bg-primary'
                  : 'h-2 w-2 bg-muted',
              )}
            />
          ))}
          {state.completedCycles > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              {state.completedCycles} ciclo{state.completedCycles !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Ring */}
        <div className="relative flex items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={cn('transition-all duration-1000', PHASE_BG[phase])}
              stroke="currentColor"
            />
          </svg>
          <div className="absolute flex flex-col items-center gap-1.5">
            <span className="text-5xl font-mono font-bold tabular-nums tracking-tighter">
              {formatDuration(remaining)}
            </span>
            <span className={cn('text-xs font-semibold uppercase tracking-widest', PHASE_COLORS[phase])}>
              {PHASE_LABELS[phase]}
            </span>
            {phase !== 'idle' && (
              <span className="text-xs text-muted-foreground">
                Ciclo {state.currentCycle}/{CYCLES_BEFORE_LONG_BREAK}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {phase === 'idle' ? (
            <Button
              size="lg"
              disabled={!displayTask}
              onClick={() => displayTask && setShowStartDialog(true)}
              className="px-8"
            >
              <Play size={16} className="mr-2" /> Iniciar foco
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={isPaused ? resume : pause}
                disabled={phase !== 'focus'}
                className="w-32"
              >
                {isPaused ? (
                  <><Play size={15} className="mr-2" /> Retomar</>
                ) : (
                  <><Pause size={15} className="mr-2" /> Pausar</>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={stop} className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
                <Square size={15} className="mr-2" /> Encerrar
              </Button>
            </>
          )}
        </div>
      </div>

      {state.monitoringEnabled && phase === 'focus' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Eye size={14} className="text-primary" />
                <span className="font-medium">Monitoramento ativo</span>
                {focusMonitor.error ? (
                  <Badge variant="destructive" className="h-4 text-xs">
                    Erro
                  </Badge>
                ) : isPaused ? (
                  <Badge variant="outline" className="h-4 text-xs">
                    Câmera off
                  </Badge>
                ) : focusMonitor.ready ? (
                  <Badge variant="secondary" className="h-4 text-xs">
                    Câmera on
                  </Badge>
                ) : (
                  <Badge variant="outline" className="h-4 text-xs">
                    Carregando…
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <AlertTriangle
                  size={13}
                  className={cn(
                    totalDistractions > 0 ? 'text-destructive' : 'text-muted-foreground',
                  )}
                />
                <span className="tabular-nums font-medium">
                  {totalDistractions} distração{totalDistractions === 1 ? '' : 'ões'}
                </span>
              </div>
            </div>
            {focusMonitor.error && (
              <p className="text-xs text-destructive mt-2">{focusMonitor.error}</p>
            )}
            {totalDistractions > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {(Object.entries(focusMonitor.counts) as [FocusEventType, number][])
                  .filter(([, c]) => c > 0)
                  .map(([type, count]) => (
                    <li key={type} className="flex justify-between">
                      <span>{FOCUS_EVENT_LABELS[type]}</span>
                      <span className="tabular-nums">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {state.monitoringEnabled && phase === 'focus' && (
        <Card>
          <CardContent className="py-3 px-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Video size={14} className="text-primary" />
              <span className="font-medium">Preview da câmera</span>
            </div>
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-fill"
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={640}
                className="absolute inset-0 h-full w-full"
              />
              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    Câmera pausada
                  </span>
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 flex gap-1.5 text-[10px] font-medium">
                <span className="flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Pessoa
                </span>
                <span className="flex items-center gap-1 rounded bg-background/80 px-1.5 py-0.5 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Celular
                </span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                Posicione a câmera <strong>acima do monitor</strong> para manter sempre
                a mesma base de referência entre sessões.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {state.lastFocusSessionId && focusSummary.data && (
        <Card>
          <CardContent className="py-4 px-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Resumo do ciclo
                </p>
                <p className="text-sm font-medium mt-0.5">
                  {focusSummary.data.total === 0
                    ? 'Nenhuma distração detectada — excelente foco!'
                    : `${focusSummary.data.total} distração${
                        focusSummary.data.total === 1 ? '' : 'ões'
                      } detectada${focusSummary.data.total === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                onClick={clearLastFocusSummary}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar resumo"
              >
                <X size={14} />
              </button>
            </div>
            {focusSummary.data.total > 0 && (
              <ul className="space-y-1 text-xs">
                {(
                  Object.entries(focusSummary.data.byType) as [
                    FocusEventType,
                    { count: number; totalDurationMs: number },
                  ][]
                ).map(([type, { count, totalDurationMs }]) => (
                  <li key={type} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {FOCUS_EVENT_LABELS[type]}
                    </span>
                    <span className="tabular-nums font-medium">
                      {count}× · {Math.round(totalDurationMs / 1000)}s
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <StartFocusDialog
        open={showStartDialog}
        task={displayTask}
        onClose={() => setShowStartDialog(false)}
        onConfirm={(monitoringEnabled) => {
          if (displayTask) {
            startFocus(displayTask, { monitoringEnabled });
          }
          setShowStartDialog(false);
        }}
      />

      {/* Duration legend */}
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Configuração
          </p>
          <div className="grid grid-cols-3 divide-x divide-border text-center text-sm">
            <div className="px-2">
              <p className="font-semibold text-primary">25 min</p>
              <p className="text-xs text-muted-foreground mt-0.5">Foco</p>
            </div>
            <div className="px-2">
              <p className="font-semibold text-green-500">5 min</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pausa curta</p>
            </div>
            <div className="px-2">
              <p className="font-semibold text-blue-500">15 min</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pausa longa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
