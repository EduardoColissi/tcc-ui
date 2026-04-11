'use client';

import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CYCLES_BEFORE_LONG_BREAK,
  FOCUS_SECONDS,
  LONG_BREAK_SECONDS,
  SHORT_BREAK_SECONDS,
  usePomodoro,
} from '@/lib/pomodoro-store';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  task: Task;
}

const PHASE_LABELS: Record<string, string> = {
  focus: 'Foco',
  short_break: 'Pausa curta',
  long_break: 'Pausa longa',
  idle: 'Pronto',
};

const PHASE_COLORS: Record<string, string> = {
  focus: 'text-primary',
  short_break: 'text-green-500',
  long_break: 'text-blue-500',
  idle: 'text-muted-foreground',
};

function phaseTotal(phase: string) {
  if (phase === 'short_break') return SHORT_BREAK_SECONDS;
  if (phase === 'long_break') return LONG_BREAK_SECONDS;
  return FOCUS_SECONDS;
}

export function PomodoroTimer({ task }: Props) {
  const { state, remaining, isRunning, startFocus, pause, resume, stop } = usePomodoro();

  const isThisTask = state.task?.id === task.id;
  const activePhase = isThisTask ? state.phase : 'idle';
  const displayRemaining = isThisTask ? remaining : FOCUS_SECONDS;
  const total = phaseTotal(activePhase);
  const progress = isThisTask ? ((total - displayRemaining) / total) * 100 : 0;
  const isPaused = isThisTask && state.pausedRemaining !== null;

  const minutes = Math.floor(displayRemaining / 60).toString().padStart(2, '0');
  const secs = (displayRemaining % 60).toString().padStart(2, '0');

  // SVG ring
  const size = 120;
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Cycle dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: CYCLES_BEFORE_LONG_BREAK }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              isThisTask && i < (state.completedCycles % CYCLES_BEFORE_LONG_BREAK)
                ? 'bg-primary'
                : 'bg-muted',
            )}
          />
        ))}
      </div>

      {/* SVG ring timer */}
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
            className={cn('transition-all duration-1000', PHASE_COLORS[activePhase])}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-mono font-bold tabular-nums">
            {minutes}:{secs}
          </span>
          <span className={cn('text-xs font-medium', PHASE_COLORS[activePhase])}>
            {PHASE_LABELS[activePhase]}
          </span>
        </div>
      </div>

      {/* Cycle label */}
      {isThisTask && activePhase !== 'idle' && (
        <p className="text-xs text-muted-foreground">
          Ciclo {state.currentCycle}/{CYCLES_BEFORE_LONG_BREAK}
        </p>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!isThisTask || activePhase === 'idle' ? (
          <Button size="sm" onClick={() => startFocus(task)}>
            <Play size={14} className="mr-1" /> Iniciar foco
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={isPaused ? resume : pause}
              disabled={activePhase !== 'focus'}
              title={activePhase !== 'focus' ? 'Não é possível pausar durante a pausa' : undefined}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </Button>
            <Button size="sm" variant="destructive" onClick={stop}>
              <Square size={14} />
            </Button>
          </>
        )}
      </div>

      {/* Other task running warning */}
      {!isThisTask && state.phase !== 'idle' && (
        <p className="text-xs text-amber-500 text-center">
          Timer rodando em &quot;{state.task?.title}&quot;.<br />
          Iniciar aqui vai encerrar o atual.
        </p>
      )}
    </div>
  );
}
