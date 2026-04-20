import type { FocusEvent, FocusEventType, FrameSignals } from './types';

const THRESHOLDS_MS: Record<FocusEventType, number> = {
  PERSON_ABSENT: 3000,
  CELL_PHONE: 800,
  MULTIPLE_PEOPLE: 2000,
  HEAD_TURNED: 1500,
  LOOKING_DOWN: 3000,
  EYES_CLOSED: 2000,
};

const YAW_LIMIT_DEG = 20;
const PITCH_DOWN_LIMIT_DEG = 20;

// After the face has been missing this long with a "person" still visible, we assume
// YOLO is tracking a chair/background and emit PERSON_ABSENT instead of HEAD_TURNED.
const FACE_LOST_GRACE_MS = 2500;
// When inferring direction from the last known angles, relax the limits slightly:
// MediaPipe tends to lose tracking just before extreme poses are fully reached.
const ANGLE_INFERENCE_SLACK_DEG = 5;

interface PendingDistraction {
  firstSeenAt: number;
  emitted: boolean;
  startedAt: Date;
}

export interface DetectionResult {
  started: FocusEventType[];
  completed: FocusEvent[];
}

/**
 * Stateful engine that consumes per-frame signals and emits distraction
 * events only after a signal persists beyond its debounce threshold.
 */
export class DetectionEngine {
  private pending: Map<FocusEventType, PendingDistraction> = new Map();
  private lastFaceSeenAt: number | null = null;
  private lastYawDeg: number | null = null;
  private lastPitchDeg: number | null = null;

  tick(signals: FrameSignals, now: number = Date.now()): DetectionResult {
    if (signals.faceDetected) {
      this.lastFaceSeenAt = now;
      if (signals.yawDeg !== null) this.lastYawDeg = signals.yawDeg;
      if (signals.pitchDeg !== null) this.lastPitchDeg = signals.pitchDeg;
    }
    const active = this.computeActiveTypes(signals, now);
    const started: FocusEventType[] = [];
    const completed: FocusEvent[] = [];

    for (const type of active) {
      const existing = this.pending.get(type);
      if (!existing) {
        this.pending.set(type, {
          firstSeenAt: now,
          emitted: false,
          startedAt: new Date(now),
        });
        continue;
      }
      if (!existing.emitted && now - existing.firstSeenAt >= THRESHOLDS_MS[type]) {
        existing.emitted = true;
        started.push(type);
      }
    }

    for (const [type, pending] of this.pending) {
      if (active.has(type)) continue;
      if (pending.emitted) {
        const endedAt = new Date(now);
        completed.push({
          type,
          startedAt: pending.startedAt,
          endedAt,
          durationMs: endedAt.getTime() - pending.startedAt.getTime(),
        });
      }
      this.pending.delete(type);
    }

    return { started, completed };
  }

  /** Close all currently-emitted events (called on stop/pause/unmount). */
  flush(now: number = Date.now()): FocusEvent[] {
    const completed: FocusEvent[] = [];
    for (const [type, pending] of this.pending) {
      if (pending.emitted) {
        const endedAt = new Date(now);
        completed.push({
          type,
          startedAt: pending.startedAt,
          endedAt,
          durationMs: endedAt.getTime() - pending.startedAt.getTime(),
        });
      }
    }
    this.pending.clear();
    return completed;
  }

  reset(): void {
    this.pending.clear();
    this.lastFaceSeenAt = null;
    this.lastYawDeg = null;
    this.lastPitchDeg = null;
  }

  private computeActiveTypes(s: FrameSignals, now: number): Set<FocusEventType> {
    const active = new Set<FocusEventType>();

    if (!s.personDetected) active.add('PERSON_ABSENT');
    if (s.multiplePersons) active.add('MULTIPLE_PEOPLE');
    if (s.cellPhoneDetected) active.add('CELL_PHONE');

    if (s.faceDetected) {
      if (s.yawDeg !== null && Math.abs(s.yawDeg) > YAW_LIMIT_DEG) {
        active.add('HEAD_TURNED');
      }
      if (s.pitchDeg !== null && s.pitchDeg > PITCH_DOWN_LIMIT_DEG) {
        active.add('LOOKING_DOWN');
      }
      if (s.eyesClosed) active.add('EYES_CLOSED');
    } else if (s.personDetected) {
      const faceLostFor =
        this.lastFaceSeenAt === null ? Infinity : now - this.lastFaceSeenAt;
      if (faceLostFor > FACE_LOST_GRACE_MS) {
        // Face missing for too long while YOLO still sees a "person": most likely
        // a chair/background false positive — treat as absent, not head turned.
        active.add('PERSON_ABSENT');
      } else if (
        this.lastPitchDeg !== null &&
        this.lastPitchDeg > PITCH_DOWN_LIMIT_DEG - ANGLE_INFERENCE_SLACK_DEG
      ) {
        active.add('LOOKING_DOWN');
      } else if (
        this.lastYawDeg !== null &&
        Math.abs(this.lastYawDeg) > YAW_LIMIT_DEG - ANGLE_INFERENCE_SLACK_DEG
      ) {
        active.add('HEAD_TURNED');
      }
    }

    return active;
  }
}
