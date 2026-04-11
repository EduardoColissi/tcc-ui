export type WorkModel = 'ONSITE' | 'HYBRID' | 'HOME_OFFICE';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType = 'PROFESSIONAL' | 'PERSONAL';
export type SessionType = 'FOCUS' | 'BREAK';

export interface User {
  id: number;
  name: string;
  email: string;
  birthDate: string;
  emailVerified: boolean;
  jobTitle: string | null;
  workModel: WorkModel | null;
  company: string | null;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface PomodoroSession {
  id: number;
  userId: number;
  taskId: number;
  type: SessionType;
  cycleNumber: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSession extends PomodoroSession {
  task: { id: number; title: string; status: TaskStatus };
}

export interface PomodoroStats {
  totalFocusSessions: number;
  totalFocusSeconds: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data: T;
}
