import * as ort from 'onnxruntime-web';

const MODEL_URL = '/models/yolov8n.onnx';
const INPUT_SIZE = 640;
const PERSON_CONFIDENCE_THRESHOLD = 0.45;
const CELL_PHONE_CONFIDENCE_THRESHOLD = 0.5;
const IOU_THRESHOLD = 0.5;

// Reject phone detections smaller than this on the longest side (640² input space).
const CELL_PHONE_MIN_DIM = 20;
// Expand person bbox by this fraction when checking phone overlap (covers hands just outside torso).
const PERSON_BBOX_EXPANSION = 0.15;

const CLASS_PERSON = 0;
const CLASS_CELL_PHONE = 67;

export interface YoloDetection {
  classId: number;
  score: number;
  bbox: [number, number, number, number];
}

type Detection = YoloDetection;

export interface YoloResult {
  personCount: number;
  cellPhoneDetected: boolean;
  detections: YoloDetection[];
}

export const YOLO_INPUT_SIZE = INPUT_SIZE;
export const YOLO_CLASS_PERSON = CLASS_PERSON;
export const YOLO_CLASS_CELL_PHONE = CLASS_CELL_PHONE;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function loadSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    ort.env.wasm.wasmPaths =
      'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  }
  return sessionPromise;
}

export async function warmupYolo(): Promise<void> {
  await loadSession();
}

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  return { canvas, ctx };
}

const canvasRef = createCanvas();
const PLANE_SIZE = INPUT_SIZE * INPUT_SIZE;
const inputBuffer = new Float32Array(3 * PLANE_SIZE);

function preprocess(video: HTMLVideoElement): Float32Array {
  if (!canvasRef) throw new Error('Canvas not available');
  const { ctx } = canvasRef;
  ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    inputBuffer[j] = data[i] / 255;
    inputBuffer[PLANE_SIZE + j] = data[i + 1] / 255;
    inputBuffer[2 * PLANE_SIZE + j] = data[i + 2] / 255;
  }

  return inputBuffer;
}

function iou(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (areaA + areaB - inter);
}

function bboxOverlaps(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

function expandBbox(
  b: [number, number, number, number],
  factor: number,
): [number, number, number, number] {
  const w = b[2] - b[0];
  const h = b[3] - b[1];
  const dx = w * factor;
  const dy = h * factor;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
}

// Phones are only counted if they pass size + spatial-overlap checks relative to a detected person.
// This suppresses background false positives (dark rectangles, screens, books).
function filterCellPhones(dets: Detection[]): Detection[] {
  const persons = dets.filter((d) => d.classId === CLASS_PERSON);
  const expandedPersons = persons.map((p) => expandBbox(p.bbox, PERSON_BBOX_EXPANSION));
  return dets.filter((d) => {
    if (d.classId !== CLASS_CELL_PHONE) return true;
    const w = d.bbox[2] - d.bbox[0];
    const h = d.bbox[3] - d.bbox[1];
    if (Math.max(w, h) < CELL_PHONE_MIN_DIM) return false;
    return expandedPersons.some((p) => bboxOverlaps(d.bbox, p));
  });
}

function nonMaxSuppression(dets: Detection[]): Detection[] {
  const sorted = [...dets].sort((x, y) => y.score - x.score);
  const kept: Detection[] = [];
  while (sorted.length) {
    const current = sorted.shift()!;
    kept.push(current);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (
        sorted[i].classId === current.classId &&
        iou(sorted[i].bbox, current.bbox) > IOU_THRESHOLD
      ) {
        sorted.splice(i, 1);
      }
    }
  }
  return kept;
}

function postprocess(output: ort.Tensor): Detection[] {
  // YOLOv8 output shape: [1, 84, 8400] — 84 = 4 bbox + 80 class scores
  const data = output.data as Float32Array;
  const [, channels, anchors] = output.dims;
  const numClasses = channels - 4;
  const dets: Detection[] = [];

  for (let i = 0; i < anchors; i++) {
    let bestClass = -1;
    let bestScore = 0;
    for (let c = 0; c < numClasses; c++) {
      const score = data[(4 + c) * anchors + i];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestClass !== CLASS_PERSON && bestClass !== CLASS_CELL_PHONE) continue;
    const threshold =
      bestClass === CLASS_CELL_PHONE
        ? CELL_PHONE_CONFIDENCE_THRESHOLD
        : PERSON_CONFIDENCE_THRESHOLD;
    if (bestScore < threshold) continue;

    const cx = data[0 * anchors + i];
    const cy = data[1 * anchors + i];
    const w = data[2 * anchors + i];
    const h = data[3 * anchors + i];
    dets.push({
      classId: bestClass,
      score: bestScore,
      bbox: [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2],
    });
  }

  return filterCellPhones(nonMaxSuppression(dets));
}

export async function detectYolo(video: HTMLVideoElement): Promise<YoloResult> {
  const session = await loadSession();
  const input = preprocess(video);
  const tensor = new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: tensor };
  const output = await session.run(feeds);
  const detections = postprocess(output[session.outputNames[0]]);

  let personCount = 0;
  let cellPhoneDetected = false;
  for (const d of detections) {
    if (d.classId === CLASS_PERSON) personCount++;
    else if (d.classId === CLASS_CELL_PHONE) cellPhoneDetected = true;
  }

  return { personCount, cellPhoneDetected, detections };
}
