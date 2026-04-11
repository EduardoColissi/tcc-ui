/**
 * Centralized toast helpers.
 *
 * All toast calls in the app should go through these functions so that:
 * - Duration, position and style are consistent across the app
 * - API error messages are extracted the same way everywhere
 * - `toast.promise` is wrapped with typed messages
 */
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Error extraction
// ---------------------------------------------------------------------------

/**
 * Extracts a user-friendly message from an Axios/API error.
 * Handles NestJS error shapes:
 *   { message: "string" }
 *   { message: { message: "string" } }
 *   { message: ["validation error"] }
 *   { message: { message: ["validation error"] } }
 */
export function extractApiError(err: unknown, fallback: string): string {
  const data = (err as any)?.response?.data;
  if (!data) return fallback;

  const m = data.message;
  if (!m) return fallback;

  if (typeof m === 'string') return m;
  if (Array.isArray(m) && m.length > 0) return String(m[0]);
  if (typeof m?.message === 'string') return m.message;
  if (Array.isArray(m?.message) && m.message.length > 0) return String(m.message[0]);

  return fallback;
}

// ---------------------------------------------------------------------------
// Toast helpers
// ---------------------------------------------------------------------------

export function toastSuccess(title: string, description?: string) {
  return toast.success(title, { description, duration: 4000 });
}

export function toastError(title: string, description?: string) {
  return toast.error(title, { description, duration: 5000 });
}

export function toastInfo(title: string, description?: string) {
  return toast.info(title, { description, duration: 4000 });
}

export function toastWarning(title: string, description?: string) {
  return toast.warning(title, { description, duration: 4000 });
}

/**
 * Shows loading → success/error toast for a promise.
 * Ideal for async operations without another visible loading indicator.
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
) {
  return toast.promise(promise, messages);
}

/**
 * Shorthand: extract API error and show toast.error.
 */
export function toastApiError(err: unknown, fallback: string, description?: string) {
  const msg = extractApiError(err, fallback);
  return toastError(msg, description);
}
