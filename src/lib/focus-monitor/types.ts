export type FocusEventType =
  | 'PERSON_ABSENT'
  | 'CELL_PHONE'
  | 'MULTIPLE_PEOPLE'
  | 'HEAD_TURNED'
  | 'LOOKING_DOWN'
  | 'EYES_CLOSED';

export interface FocusEvent {
  type: FocusEventType;
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
}

export interface FrameSignals {
  personDetected: boolean;
  multiplePersons: boolean;
  cellPhoneDetected: boolean;
  yawDeg: number | null;
  pitchDeg: number | null;
  eyesClosed: boolean;
  faceDetected: boolean;
}
