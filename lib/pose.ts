// 사진 속 몸의 관절 위치를 브라우저에서 찾는다. (MediaPipe 포즈 모델)
// 사진은 서버로 따로 보내지 않고 이 브라우저 안에서만 처리한다. 모델·실행 파일은 우리 사이트(public/mediapipe)에서 받는다.
// 브라우저에서만 쓴다. (서버 코드에서 불러오지 않는다)
//
// 자세 판정 방법: 정석 예시 사진에서도 같은 몸 인식을 돌려 "정석의 선"을 얻고,
// 내 사진의 선과 부위별로 각도를 비교한다. (비교 결과로 같으면 초록, 다르면 빨강은 lib/form.ts가 정한다)

import { SAME_WITHIN_DEG } from "./form";
import type { OverlayPart, PoseComparison } from "./types";

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
      const original = console.error;
      console.error = (...args: unknown[]) => {
        if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
        original(...args);
      };
      try {
        return await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate: "CPU" },
          runningMode: "IMAGE",
          numPoses: 1,
        });
      } finally {
        console.error = original;
      }
    })();
    landmarkerPromise.catch(() => {
      landmarkerPromise = null;
    });
  }
  return landmarkerPromise;
}

/** 몸 인식 모델을 미리 불러와 둔다. (처음 쓸 때 15MB 가까이 내려받느라 비교가 늦어지지 않게, 화면을 열 때 호출한다) */
export function warmUpPose(): void {
  loadLandmarker().catch(() => {});
}

/** 부위를 이루는 관절 이름들 (이어진 순서대로). 팔은 어깨–팔꿈치–손목 */
const PART_JOINTS: Record<OverlayPart, (keyof typeof LEFT)[]> = {
  arm: ["shoulder", "elbow", "wrist"],
  back: ["shoulder", "hip"],
  thigh: ["hip", "knee"],
  shin: ["knee", "ankle"],
  neck: ["ear", "shoulder"],
};

/** 비교에 쓰는 부위: 등과 다리. (팔 위치는 자세 판정에 중요하지 않아 비교하지 않고, 목은 선만 그린다) */
const COMPARED_PARTS: OverlayPart[] = ["back", "thigh", "shin"];

/** 사진 한 장을 분석한 결과 */
export interface PoseAnalysis {
  /** 사진 위에 그릴 부위별 선 위치 (0~1) */
  paths: PartPaths;
  /** 부위별 마디의 기울어진 각도(도). 사진의 가로·세로 비율을 반영한 픽셀 좌표 기준이고 팔은 마디가 2개다. */
  angles: Partial<Record<OverlayPart, number[]>>;
}

/** 같은 사진을 다시 분석하지 않도록 결과를 기억해 둔다. (정석 사진, 요청 전 비교, 결과 화면의 선이 같은 값을 쓴다) */
const analysisCache = new Map<string, PoseAnalysis | null>();

/**
 * 사진에서 몸을 찾아 부위별 선 위치와 마디 각도를 돌려준다. 몸을 찾지 못하면 null.
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

  const paths: PartPaths = {};
  const angles: PoseAnalysis["angles"] = {};
  for (const part of Object.keys(PART_JOINTS) as OverlayPart[]) {
    const points = PART_JOINTS[part].map((joint) => point(side[joint]));
    if (!points.every((p): p is Point => p !== null)) continue;
    paths[part] = points;
    // 각도는 사진의 가로·세로 비율을 반영한 픽셀 좌표로 계산한다. (y는 아래쪽이 크다)
    const pixels = points.map((p): Point => [p[0] * image.naturalWidth, p[1] * image.naturalHeight]);
    angles[part] = pixels.slice(1).map((p, index) => (Math.atan2(p[1] - pixels[index][1], p[0] - pixels[index][0]) * 180) / Math.PI);
  }
  if (Object.keys(paths).length === 0) {
    analysisCache.set(key, null);
    return null;
  }

  const analysis: PoseAnalysis = { paths, angles };
  analysisCache.set(key, analysis);
  return analysis;
}

/** 사진 주소 하나를 불러와 몸 인식을 돌린다. */
export async function analyzeUrl(url: string): Promise<PoseAnalysis | null> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return analyzePose(image);
}

/** 두 각도의 차이(0~180도) */
function angleGap(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** 좌우를 뒤집은 각도 (사진 속 사람이 반대 방향을 보고 있을 때) */
function mirror(angle: number): number {
  return 180 - angle;
}

/** 부호 있는 각도 차이를 -180~180도로 맞춘다. (꺾인 방향까지 비교할 때 쓴다) */
function wrap(angle: number): number {
  let value = angle % 360;
  if (value > 180) value -= 360;
  if (value <= -180) value += 360;
  return value;
}

/**
 * 이어진 두 부위가 만나는 관절: 엉덩이(등–허벅지), 무릎(허벅지–정강이).
 * 마디마다 각도가 조금씩만 달라도 관절 한 곳이 꺾여 있으면 몸 모양이 달라 보이므로(예: 플랭크에서 엉덩이가 솟음), 꺾인 정도도 정석과 비교한다.
 */
const JOINTS: [OverlayPart, OverlayPart][] = [
  ["back", "thigh"],
  ["thigh", "shin"],
];

/** 관절이 꺾인 정도가 정석과 이만큼(도)까지 다르면 같은 것으로 본다. */
export const BEND_SAME_DEG = 9;

/**
 * 내 사진의 선을 정석 사진의 선과 부위별로 비교해, 부위마다 얼마나 다른지 돌려준다.
 * 사진 속 사람이 보는 방향이 반대일 수 있어서, 그대로 비교한 것과 좌우를 뒤집어 비교한 것 중 더 비슷한 쪽을 쓴다.
 * 각 부위의 각도 차이와, 이어진 관절(엉덩이·무릎)이 꺾인 정도의 차이를 함께 본다. 관절 꺾임이 다르면 그 관절에 닿은 두 부위가 다른 것으로 친다.
 * 양쪽 사진에서 모두 찾은 부위가 2개 미만이면 비교할 수 없으므로 null이다.
 */
export function compareToStandard(user: PoseAnalysis | null, standard: PoseAnalysis | null): PoseComparison | null {
  if (!user || !standard) return null;
  const common = COMPARED_PARTS.filter((part) => user.angles[part] && standard.angles[part]);
  if (common.length < 2) return null;

  const mineAngle = (part: OverlayPart, flip: boolean) => {
    const angle = (user.angles[part] as number[])[0];
    return flip ? mirror(angle) : angle;
  };
  const refAngle = (part: OverlayPart) => (standard.angles[part] as number[])[0];

  const gapsFor = (flip: boolean) => common.map((part) => angleGap(mineAngle(part, flip), refAngle(part)));
  const straight = gapsFor(false);
  const flipped = gapsFor(true);
  const total = (list: number[]) => list.reduce((sum, value) => sum + value, 0);
  const flip = total(flipped) < total(straight);
  const gaps = flip ? flipped : straight;

  // 관절이 꺾인 정도(부호 있음)를 정석과 비교한다. 다르면 닿은 두 부위의 차이를 기준 이상으로 올려 "다름"이 되게 한다.
  for (const [first, second] of JOINTS) {
    if (!common.includes(first) || !common.includes(second)) continue;
    const mine = wrap(mineAngle(second, flip) - mineAngle(first, flip));
    const ref = wrap(refAngle(second) - refAngle(first));
    const bendGap = Math.abs(wrap(mine - ref));
    if (bendGap <= BEND_SAME_DEG) continue;
    for (const part of [first, second]) {
      const index = common.indexOf(part);
      gaps[index] = Math.max(gaps[index], SAME_WITHIN_DEG[part] + 1 + (bendGap - BEND_SAME_DEG));
    }
  }

  return { parts: common.map((part, index) => ({ part, deltaDeg: Math.min(180, Math.round(gaps[index])) })) };
}


