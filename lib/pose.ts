// 사진 속 몸의 관절 위치를 브라우저에서 찾는다. (MediaPipe 포즈 모델)
// 사진은 서버로 따로 보내지 않고 이 브라우저 안에서만 처리한다. 모델·실행 파일은 우리 사이트(public/mediapipe)에서 받는다.
// 브라우저에서만 쓴다. (서버 코드에서 불러오지 않는다)

import type { OverlayPart } from "./types";

/** 사진 전체를 0~1로 본 점 위치 */
export type Point = [number, number];

/** 부위별로 이어서 그릴 점들 (선이 꺾이면 점이 3개) */
export type PartPaths = Partial<Record<OverlayPart, Point[]>>;

// MediaPipe 포즈 관절 번호
const LEFT = { ear: 7, shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 };
const RIGHT = { ear: 8, shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 };

/** 이 값보다 잘 안 보이는 관절은 선에 쓰지 않는다 */
const MIN_VISIBILITY = 0.3;

type Landmark = { x: number; y: number; visibility?: number };
type Landmarker = { detect: (image: HTMLImageElement) => { landmarks: Landmark[][] } };

let landmarkerPromise: Promise<Landmarker> | null = null;

/**
 * MediaPipe는 오류가 아닌 안내 글("INFO: Created TensorFlow Lite ...")도 console.error로 찍어서, 개발 화면에 오류처럼 뜬다.
 * 실행하는 동안만 "INFO:"로 시작하는 글을 걸러 내고, 진짜 오류는 그대로 둔다.
 */
function withoutInfoLogs<T>(run: () => T): T {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
    original(...args);
  };
  try {
    return run();
  } finally {
    console.error = original;
  }
}

/** 모델은 처음 한 번만 불러와 계속 쓴다. 실패하면 다음에 다시 시도할 수 있게 비운다. */
function loadLandmarker(): Promise<Landmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return withoutInfoLogsAsync(() => PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate: "CPU" },
        runningMode: "IMAGE",
        numPoses: 1,
      }));
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}

/** 위와 같지만 비동기 작업이 끝날 때까지 걸러 낸다. */
async function withoutInfoLogsAsync<T>(run: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
    original(...args);
  };
  try {
    return await run();
  } finally {
    console.error = original;
  }
}

/**
 * 몸 모양 측정값. (몸의 중심선이 얼마나 곧은지)
 * - lineAngleDeg: 어깨–엉덩이–(발목 또는 무릎)이 이루는 각도. 180도에 가까울수록 일직선이다.
 * - hipOffsetPct: 엉덩이가 어깨–(발목 또는 무릎)을 이은 선에서 얼마나 벗어났는지. 선 길이의 %이고, +이면 엉덩이가 선보다 아래(처짐), -이면 위(솟음)이다.
 */
export interface BodyLineMeasure {
  /** 기준으로 삼은 끝 관절: 플랭크는 발목, 브릿지는 무릎 */
  reference: "ankle" | "knee";
  lineAngleDeg: number;
  hipOffsetPct: number;
}

/** 사진 한 장을 분석한 결과 */
export interface PoseAnalysis {
  paths: PartPaths;
  /** 어깨–엉덩이–발목 기준 측정값 (관절이 안 보이면 없음) */
  ankleLine?: BodyLineMeasure;
  /** 어깨–엉덩이–무릎 기준 측정값 (관절이 안 보이면 없음) */
  kneeLine?: BodyLineMeasure;
}

/** 같은 사진을 다시 분석하지 않도록 결과를 기억해 둔다. (결과 화면의 선과 요청 전 측정이 같은 값을 쓴다) */
const analysisCache = new Map<string, PoseAnalysis | null>();

/** 세 점 a–b–c에서 b의 각도(도). 점은 사진 비율을 반영한 픽셀 단위여야 한다. */
function angleAt(a: Point, b: Point, c: Point): number {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const len = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]);
  if (len === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / len))) * 180) / Math.PI;
}

/** 어깨(a)–끝(c)을 이은 선에서 엉덩이(b)가 벗어난 정도(선 길이의 %). 엉덩이가 선보다 아래면 +, 위면 -. */
function hipOffset(a: Point, b: Point, c: Point): number {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return 0;
  // 엉덩이 x 위치에서의 선 높이(y)와 비교한다. (사진에서 아래쪽이 y가 크다)
  const lineY = dx === 0 ? a[1] : a[1] + (dy * (b[0] - a[0])) / dx;
  const vertical = b[1] - lineY;
  // 선이 기울어 있어도 수직 거리로 바꿔 선 길이에 대한 비율로 나타낸다.
  const perpendicular = dx === 0 ? 0 : (vertical * Math.abs(dx)) / len;
  return Math.round((perpendicular / len) * 1000) / 10;
}

/**
 * 사진에서 몸을 찾아 부위별 선 위치와 몸 중심선 측정값을 돌려준다. 몸을 찾지 못하면 null.
 * 옆모습 사진이 많아서, 더 잘 보이는 쪽(왼쪽/오른쪽) 몸을 쓴다.
 */
export async function analyzePose(image: HTMLImageElement): Promise<PoseAnalysis | null> {
  const key = image.currentSrc || image.src;
  if (analysisCache.has(key)) return analysisCache.get(key) ?? null;

  const landmarker = await loadLandmarker();
  const pose = withoutInfoLogs(() => landmarker.detect(image)).landmarks[0];
  if (!pose) {
    analysisCache.set(key, null);
    return null;
  }

  const score = (side: typeof LEFT) => Object.values(side).reduce((sum, index) => sum + (pose[index]?.visibility ?? 0), 0);
  const side = score(LEFT) >= score(RIGHT) ? LEFT : RIGHT;

  const point = (index: number): Point | null => {
    const landmark = pose[index];
    if (!landmark || (landmark.visibility ?? 0) < MIN_VISIBILITY) return null;
    return [landmark.x, landmark.y];
  };
  const path = (...indexes: number[]): Point[] | undefined => {
    const points = indexes.map(point);
    return points.every((p): p is Point => p !== null) ? (points as Point[]) : undefined;
  };

  const paths: PartPaths = {
    arm: path(side.shoulder, side.elbow, side.wrist),
    back: path(side.shoulder, side.hip),
    thigh: path(side.hip, side.knee),
    shin: path(side.knee, side.ankle),
    neck: path(side.ear, side.shoulder),
  };
  if (!Object.values(paths).some(Boolean)) {
    analysisCache.set(key, null);
    return null;
  }

  // 각도는 사진의 가로·세로 비율을 반영한 픽셀 좌표로 계산한다.
  const scale = (p: Point): Point => [p[0] * image.naturalWidth, p[1] * image.naturalHeight];
  const measure = (reference: "ankle" | "knee"): BodyLineMeasure | undefined => {
    const points = path(side.shoulder, side.hip, side[reference]);
    if (!points) return undefined;
    const [shoulder, hip, end] = points.map(scale);
    return {
      reference,
      lineAngleDeg: Math.round(angleAt(shoulder, hip, end)),
      hipOffsetPct: hipOffset(shoulder, hip, end),
    };
  };

  const analysis: PoseAnalysis = { paths, ankleLine: measure("ankle"), kneeLine: measure("knee") };
  analysisCache.set(key, analysis);
  return analysis;
}

/** 부위별 선 위치만 필요할 때 (결과 화면) */
export async function findPartPaths(image: HTMLImageElement): Promise<PartPaths | null> {
  return (await analyzePose(image))?.paths ?? null;
}
