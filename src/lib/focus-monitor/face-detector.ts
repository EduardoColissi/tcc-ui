import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const EYE_CLOSED_THRESHOLD = 0.6;

export interface FaceResult {
  faceDetected: boolean;
  yawDeg: number | null;
  pitchDeg: number | null;
  eyesClosed: boolean;
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function loadLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    })();
  }
  return landmarkerPromise;
}

export async function warmupFace(): Promise<void> {
  await loadLandmarker();
}

/**
 * Extract Euler angles (yaw, pitch) from the 4x4 facial transformation matrix.
 * MediaPipe returns a column-major matrix. Yaw = rotation around Y, Pitch = rotation around X.
 */
function matrixToYawPitch(m: ArrayLike<number>): { yaw: number; pitch: number } {
  // MediaPipe returns column-major flat data; extract R[2][0]=m[2], R[2][1]=m[6], R[2][2]=m[10].
  const r20 = m[2];
  const r21 = m[6];
  const r22 = m[10];
  const pitch = Math.atan2(-r21, Math.sqrt(r20 * r20 + r22 * r22));
  const yaw = Math.atan2(r20, r22);
  return {
    yaw: (yaw * 180) / Math.PI,
    pitch: (pitch * 180) / Math.PI,
  };
}

export async function detectFace(
  video: HTMLVideoElement,
  timestampMs: number,
): Promise<FaceResult> {
  const landmarker = await loadLandmarker();
  const result = landmarker.detectForVideo(video, timestampMs);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return { faceDetected: false, yawDeg: null, pitchDeg: null, eyesClosed: false };
  }

  let yawDeg: number | null = null;
  let pitchDeg: number | null = null;
  if (
    result.facialTransformationMatrixes &&
    result.facialTransformationMatrixes.length > 0
  ) {
    const matrix = result.facialTransformationMatrixes[0].data;
    const angles = matrixToYawPitch(matrix);
    yawDeg = angles.yaw;
    pitchDeg = angles.pitch;
  }

  let eyesClosed = false;
  if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
    const categories = result.faceBlendshapes[0].categories;
    const left = categories.find((c) => c.categoryName === 'eyeBlinkLeft');
    const right = categories.find((c) => c.categoryName === 'eyeBlinkRight');
    if (left && right) {
      eyesClosed = left.score > EYE_CLOSED_THRESHOLD && right.score > EYE_CLOSED_THRESHOLD;
    }
  }

  return { faceDetected: true, yawDeg, pitchDeg, eyesClosed };
}
