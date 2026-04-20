'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import api from '@/lib/api';
import { DetectionEngine } from './detection-engine';
import { detectFace, warmupFace } from './face-detector';
import { detectYolo, warmupYolo, type YoloDetection } from './yolo-detector';
import type { FocusEvent, FocusEventType, FrameSignals } from './types';

const TICK_INTERVAL_MS = 400;
const FLUSH_INTERVAL_MS = 10_000;
// Phone detections flicker frame-to-frame; smooth by requiring N positives over a short window.
const PHONE_WINDOW_SIZE = 5;
const PHONE_WINDOW_MIN_POSITIVES = 2;

export type FocusCounts = Record<FocusEventType, number>;

const emptyCounts = (): FocusCounts => ({
  PERSON_ABSENT: 0,
  CELL_PHONE: 0,
  MULTIPLE_PEOPLE: 0,
  HEAD_TURNED: 0,
  LOOKING_DOWN: 0,
  EYES_CLOSED: 0,
});

interface UseFocusMonitorOptions {
  sessionId: number | null;
  enabled: boolean;
  onWarning?: (type: FocusEventType) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
}

interface UseFocusMonitorReturn {
  ready: boolean;
  error: string | null;
  counts: FocusCounts;
  detections: YoloDetection[];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useFocusMonitor({
  sessionId,
  enabled,
  onWarning,
  videoRef,
}: UseFocusMonitorOptions): UseFocusMonitorReturn {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<FocusCounts>(emptyCounts);
  const [detections, setDetections] = useState<YoloDetection[]>([]);

  const videoRefRef = useRef(videoRef);
  useEffect(() => {
    videoRefRef.current = videoRef;
  }, [videoRef]);

  const onWarningRef = useRef(onWarning);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const bufferRef = useRef<FocusEvent[]>([]);

  const sendBatch = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    if (bufferRef.current.length === 0) return;
    const events = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      await api.post(`/pomodoro/sessions/${sid}/focus-events`, {
        events: events.map((e) => ({
          type: e.type,
          startedAt: e.startedAt.toISOString(),
          endedAt: e.endedAt?.toISOString(),
          durationMs: e.durationMs,
        })),
      });
    } catch {
      bufferRef.current.unshift(...events);
    }
  }, []);

  const hasSession = sessionId !== null;

  useEffect(() => {
    if (!enabled || !hasSession) return;

    const engine = new DetectionEngine();
    let cancelled = false;
    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    const phoneWindow: boolean[] = [];

    bufferRef.current = [];

    const runLoop = async () => {
      setError(null);
      setReady(false);
      setCounts(emptyCounts());
      setDetections([]);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video = videoRefRef.current?.current ?? document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        await Promise.all([warmupYolo(), warmupFace()]);
        if (cancelled) return;

        setReady(true);
        flushTimer = setInterval(() => {
          void sendBatch();
        }, FLUSH_INTERVAL_MS);

        while (!cancelled) {
          if (video.readyState >= 2) {
            try {
              const [yolo, face] = await Promise.all([
                detectYolo(video),
                detectFace(video, performance.now()),
              ]);
              phoneWindow.push(yolo.cellPhoneDetected);
              if (phoneWindow.length > PHONE_WINDOW_SIZE) phoneWindow.shift();
              const phoneSmoothed =
                phoneWindow.filter(Boolean).length >= PHONE_WINDOW_MIN_POSITIVES;

              const signals: FrameSignals = {
                personDetected: yolo.personCount > 0 || face.faceDetected,
                multiplePersons: yolo.personCount > 1,
                cellPhoneDetected: phoneSmoothed,
                yawDeg: face.yawDeg,
                pitchDeg: face.pitchDeg,
                eyesClosed: face.eyesClosed,
                faceDetected: face.faceDetected,
              };

              setDetections(yolo.detections);
              const { started, completed } = engine.tick(signals);
              if (started.length > 0) {
                setCounts((prev) => {
                  const next = { ...prev };
                  for (const type of started) next[type] = (next[type] ?? 0) + 1;
                  return next;
                });
                for (const type of started) onWarningRef.current?.(type);
              }
              if (completed.length > 0) {
                bufferRef.current.push(...completed);
              }
            } catch (err) {
              console.error('[focus-monitor] tick error', err);
            }
          }
          await sleep(TICK_INTERVAL_MS);
        }
      } catch (err) {
        console.error('[focus-monitor] start failed', err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Falha ao iniciar monitoramento',
          );
        }
      }
    };

    void runLoop();

    return () => {
      cancelled = true;
      if (flushTimer) clearInterval(flushTimer);

      const residual = engine.flush();
      if (residual.length > 0) bufferRef.current.push(...residual);
      void sendBatch();

      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      setDetections([]);
      setReady(false);
    };
  }, [enabled, hasSession, sendBatch]);

  return { ready, error, counts, detections };
}
