'use client';

/**
 * Global Pomodoro timer context.
 *
 * Core resilience strategy: instead of a countdown, we store `endTime` (absolute ms timestamp).
 * Remaining time is always `endTime - Date.now()`, so refreshes/re-renders never lose progress.
 * State is also persisted to localStorage so it survives page reloads.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import api from '@/lib/api';
import { toastSuccess, toastError } from '@/lib/toast';
import type { Task } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FOCUS_SECONDS = 25 * 60;
export const SHORT_BREAK_SECONDS = 5 * 60;
export const LONG_BREAK_SECONDS = 15 * 60;
export const CYCLES_BEFORE_LONG_BREAK = 4;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Phase = 'idle' | 'focus' | 'short_break' | 'long_break';

export interface PomodoroState {
  phase: Phase;
  task: Task | null;
  sessionId: number | null;
  /** Absolute timestamp (ms) when current phase ends. null when idle/paused. */
  endTime: number | null;
  /** Remaining ms when paused. null when not paused. */
  pausedRemaining: number | null;
  /** How many FOCUS cycles have been completed in this sequence */
  completedCycles: number;
  /** Which focus cycle we are currently in (1-based) */
  currentCycle: number;
}

type Action =
  | { type: 'START'; task: Task; sessionId: number; endTime: number }
  | { type: 'PAUSE'; pausedRemaining: number }
  | { type: 'RESUME'; endTime: number }
  | { type: 'STOP' }
  | { type: 'PHASE_COMPLETE' }
  | { type: 'START_BREAK'; sessionId: number; endTime: number; long: boolean }
  | { type: 'BREAK_COMPLETE' }
  | { type: 'RESTORE'; state: PomodoroState };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const INITIAL_STATE: PomodoroState = {
  phase: 'idle',
  task: null,
  sessionId: null,
  endTime: null,
  pausedRemaining: null,
  completedCycles: 0,
  currentCycle: 1,
};

function reducer(state: PomodoroState, action: Action): PomodoroState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'focus',
        task: action.task,
        sessionId: action.sessionId,
        endTime: action.endTime,
        pausedRemaining: null,
      };
    case 'PAUSE':
      return { ...state, endTime: null, pausedRemaining: action.pausedRemaining };
    case 'RESUME':
      return { ...state, endTime: action.endTime, pausedRemaining: null };
    case 'STOP':
      return { ...INITIAL_STATE };
    case 'PHASE_COMPLETE':
      return { ...state, endTime: null, sessionId: null };
    case 'START_BREAK':
      return {
        ...state,
        phase: action.long ? 'long_break' : 'short_break',
        sessionId: action.sessionId,
        endTime: action.endTime,
        pausedRemaining: null,
        completedCycles: state.completedCycles + 1,
        // currentCycle advances after the BREAK completes
      };
    case 'BREAK_COMPLETE': {
      // Keep task + cycle counters, reset phase to idle so user starts next focus manually
      const nextCycle = state.completedCycles % CYCLES_BEFORE_LONG_BREAK + 1;
      return {
        ...INITIAL_STATE,
        task: state.task,
        completedCycles: state.completedCycles,
        currentCycle: nextCycle,
      };
    }
    case 'RESTORE':
      return action.state;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'pomodoro_state';

function persist(state: PomodoroState) {
  if (state.phase === 'idle') {
    localStorage.removeItem(LS_KEY);
  } else {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
}

function hydrate(): PomodoroState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PomodoroState;
    // If endTime is in the past and not paused, the phase already expired
    if (parsed.endTime && parsed.endTime < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ContextValue {
  state: PomodoroState;
  remaining: number; // seconds remaining in current phase
  isRunning: boolean;
  startFocus: (task: Task) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const PomodoroContext = createContext<ContextValue | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tick: recalculate remaining every second
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Force re-render counter for the tick
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => forceRender(), 500);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = hydrate();
    if (saved) {
      dispatch({ type: 'RESTORE', state: saved });
      if (saved.endTime) startTick();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every state change
  useEffect(() => {
    persist(state);
  }, [state]);

  // Manage tick lifecycle
  useEffect(() => {
    if (state.endTime && state.phase !== 'idle') {
      startTick();
    } else {
      stopTick();
    }
    return stopTick;
  }, [state.endTime, state.phase, startTick, stopTick]);

  // -------------------------------------------------------------------------
  // Detect phase completion
  // -------------------------------------------------------------------------
  const handlePhaseComplete = useCallback(async () => {
    const s = stateRef.current;
    if (!s.sessionId || !s.task) return;

    dispatch({ type: 'PHASE_COMPLETE' });

    const isFocus = s.phase === 'focus';
    const plannedSeconds = isFocus
      ? FOCUS_SECONDS
      : s.phase === 'short_break' ? SHORT_BREAK_SECONDS : LONG_BREAK_SECONDS;

    try {
      await api.put(`/pomodoro/sessions/${s.sessionId}/end`, {
        completed: true,
        plannedDurationSeconds: plannedSeconds,
      });
    } catch {
      // silently ignore — session will be cleaned up on next start
    }

    if (isFocus) {
      const newCompleted = s.completedCycles + 1;
      const isLong = newCompleted % CYCLES_BEFORE_LONG_BREAK === 0;
      const breakSeconds = isLong ? LONG_BREAK_SECONDS : SHORT_BREAK_SECONDS;
      const label = isLong ? 'Pausa longa' : 'Pausa curta';
      toastSuccess(`Ciclo ${s.currentCycle} concluído!`, `${label} iniciada — descanse um pouco.`);

      try {
        const { data } = await api.post('/pomodoro/sessions', {
          taskId: s.task.id,
          type: 'BREAK',
          cycleNumber: s.currentCycle,
        });
        dispatch({
          type: 'START_BREAK',
          sessionId: data.data.id,
          endTime: Date.now() + breakSeconds * 1000,
          long: isLong,
        });
      } catch {
        toastError('Erro ao iniciar pausa.', 'Tente reiniciar o ciclo.');
      }
    } else {
      // Break ended → advance to next cycle, keep task selected
      const nextCycle = s.completedCycles % CYCLES_BEFORE_LONG_BREAK + 1;
      toastSuccess('Pausa finalizada!', `Ciclo ${nextCycle} pronto para iniciar.`);
      dispatch({ type: 'BREAK_COMPLETE' });
    }
  }, []);

  // Check for phase completion on every tick
  useEffect(() => {
    if (state.endTime && state.endTime <= Date.now() && state.phase !== 'idle') {
      handlePhaseComplete();
    }
  });

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const startFocus = useCallback(async (task: Task) => {
    const s = stateRef.current;
    // Stop any running session first
    if (s.sessionId) {
      try {
        await api.put(`/pomodoro/sessions/${s.sessionId}/end`, { completed: false });
      } catch {}
    }

    try {
      const { data } = await api.post('/pomodoro/sessions', {
        taskId: task.id,
        type: 'FOCUS',
        cycleNumber: s.currentCycle,
      });
      dispatch({
        type: 'START',
        task,
        sessionId: data.data.id,
        endTime: Date.now() + FOCUS_SECONDS * 1000,
      });
    } catch {
      toastError('Erro ao iniciar sessão.', 'Verifique sua conexão e tente novamente.');
    }
  }, []);

  const pause = useCallback(() => {
    const s = stateRef.current;
    if (!s.endTime) return;
    dispatch({ type: 'PAUSE', pausedRemaining: s.endTime - Date.now() });
  }, []);

  const resume = useCallback(() => {
    const s = stateRef.current;
    if (!s.pausedRemaining) return;
    dispatch({ type: 'RESUME', endTime: Date.now() + s.pausedRemaining });
  }, []);

  const stop = useCallback(async () => {
    const s = stateRef.current;
    if (s.sessionId) {
      try {
        await api.put(`/pomodoro/sessions/${s.sessionId}/end`, { completed: false });
      } catch {}
    }
    dispatch({ type: 'STOP' });
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const isRunning = state.phase !== 'idle' && state.endTime !== null;

  let remaining = 0;
  if (state.endTime) {
    remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
  } else if (state.pausedRemaining) {
    remaining = Math.ceil(state.pausedRemaining / 1000);
  } else if (state.phase === 'focus') {
    remaining = FOCUS_SECONDS;
  } else if (state.phase === 'short_break') {
    remaining = SHORT_BREAK_SECONDS;
  } else if (state.phase === 'long_break') {
    remaining = LONG_BREAK_SECONDS;
  }

  return (
    <PomodoroContext.Provider value={{ state, remaining, isRunning, startFocus, pause, resume, stop }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used inside PomodoroProvider');
  return ctx;
}
