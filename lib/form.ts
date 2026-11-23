// 몸 인식으로 잰 측정값을 보고 자세가 정석과 같은지 코드가 판정한다. (AI의 눈대중 대신)
// 판정(정석/조금 다름/많이 다름)과 어느 부위가 다른지는 여기서 정하고, AI는 그 결과를 쉬운 말로 풀어 쓰며 몸 정보에 맞는 안내를 한다.
//
// 기준 값은 초안이다. 정석 예시 사진 8장(남·여 × 4가지 운동)의 측정값에 가깝게 조여서 잡았다.
// (예시 사진 측정값: 스쿼트 상체 40도·무릎 61~63도, 런지 상체 1도·무릎 94~99도, 플랭크 일직선 164~166도·엉덩이 -6~-7%·팔꿈치 6%,
//  브릿지 일직선 175도·엉덩이 2%·무릎 67도) 몸 인식은 같은 자세도 3~5도쯤 흔들려서 너무 조이면 잘한 자세도 다르다고 나온다.
// 실제 정석 범위는 전문가 확인이 필요하다.

import { getBodyLoad } from "./body";
import type { ExerciseId, OverlayItem, OverlayPart, PoseMeasurements, Profile, Verdict } from "./types";

/** 정석과 다른 점 하나 */
interface FormIssue {
  /** 사용자에게 보여 줄 쉬운 말 (숫자 없이) */
  text: string;
  /** 크게 다르면 large */
  severity: "slight" | "large";
  /** 다르다고 빨갛게 표시할 부위 */
  parts: OverlayPart[];
}

/** 코드가 내린 자세 판정 */
export interface FormJudgement {
  verdict: Verdict;
  /** 판정한 부위별 결과 (판정하지 않은 부위는 없음) */
  parts: OverlayItem[];
  /** 정석과 다른 점 (없으면 빈 목록) */
  issues: string[];
  /** AI가 맞춤 안내에 참고할 사실 (판정에는 영향 없음) */
  facts: string[];
}

// ─── 기준 값 (초안) ───
const PLANK = { minLineAngle: 160, maxHipOffset: 8, largeLineAngle: 150, largeHipOffset: 14, maxElbowOffset: 14 };
const BRIDGE = { minLineAngle: 165, maxHipOffset: 8, largeLineAngle: 150, minKneeAngle: 55, maxKneeAngle: 95 };
// 무릎 각도는 작을수록 깊게 굽힌 것. 깊이는 정석 범위 밖이면 다르다고 본다.
const SQUAT = { maxTorsoLean: 48, largeTorsoLean: 62, minKneeAngle: 45, maxKneeAngle: 90, largeMaxKneeAngle: 115 };
const LUNGE = { maxTorsoLean: 12, largeTorsoLean: 25, minKneeAngle: 75, maxKneeAngle: 115, largeMaxKneeAngle: 135 };

/** 얕게 시작하라고 권하는 몸 조건인지: 관절 부담이 "주의" 이상이거나 무릎·허리가 불편한 경우 */
function needsShallowDepth(profile: Profile): boolean {
  return getBodyLoad(profile) !== "normal" || profile.injuries.includes("knee") || profile.injuries.includes("back");
}

/** 판정에 쓸 수 있는 측정값이 있는 운동인지 */
function evaluate(exerciseId: ExerciseId, m: PoseMeasurements, lenientDepth: boolean): { issues: FormIssue[]; judged: OverlayPart[]; facts: string[] } | null {
  const issues: FormIssue[] = [];
  const judged: OverlayPart[] = [];
  const facts: string[] = [];

  if (exerciseId === "plank") {
    if (m.lineAngleDeg !== undefined && m.hipOffsetPct !== undefined) {
      judged.push("back", "thigh", "shin");
      const offset = m.hipOffsetPct;
      if (m.lineAngleDeg < PLANK.minLineAngle || Math.abs(offset) > PLANK.maxHipOffset) {
        const large = m.lineAngleDeg < PLANK.largeLineAngle || Math.abs(offset) > PLANK.largeHipOffset;
        issues.push({
          text: offset > 0 ? "엉덩이가 어깨와 발목을 이은 선보다 아래로 처져 있어요." : "엉덩이가 어깨와 발목을 이은 선보다 위로 솟아 있어요.",
          severity: large ? "large" : "slight",
          parts: ["back", "thigh", "shin"],
        });
      }
    }
    if (m.elbowOffsetPct !== undefined) {
      judged.push("arm");
      if (m.elbowOffsetPct > PLANK.maxElbowOffset) {
        issues.push({ text: "팔꿈치가 어깨 바로 아래에서 많이 벗어나 있어요.", severity: "slight", parts: ["arm"] });
      }
    }
  } else if (exerciseId === "bridge") {
    if (m.lineAngleDeg !== undefined && m.hipOffsetPct !== undefined) {
      judged.push("back", "thigh");
      if (m.lineAngleDeg < BRIDGE.minLineAngle || Math.abs(m.hipOffsetPct) > BRIDGE.maxHipOffset) {
        issues.push({
          text: m.hipOffsetPct > 0 ? "엉덩이가 어깨와 무릎을 이은 선보다 낮아서 몸이 일직선이 되지 않았어요." : "엉덩이를 너무 높이 들어 허리가 꺾여 있어요.",
          severity: m.lineAngleDeg < BRIDGE.largeLineAngle ? "large" : "slight",
          parts: ["back", "thigh"],
        });
      }
    }
    if (m.kneeAngleDeg !== undefined) {
      judged.push("shin");
      if (m.kneeAngleDeg < BRIDGE.minKneeAngle || m.kneeAngleDeg > BRIDGE.maxKneeAngle) {
        issues.push({ text: "무릎이 너무 접히거나 펴져 있어서 발 위치를 조정하면 좋아요.", severity: "slight", parts: ["shin"] });
      }
    }
  } else if (exerciseId === "squat" || exerciseId === "lunge") {
    const rule = exerciseId === "squat" ? SQUAT : LUNGE;
    if (m.torsoLeanDeg !== undefined) {
      judged.push("back");
      if (m.torsoLeanDeg > rule.maxTorsoLean) {
        issues.push({
          text: exerciseId === "squat" ? "상체가 앞으로 많이 숙여져 있어요." : "상체가 앞으로 기울어져 있어요. 곧게 세우면 좋아요.",
          severity: m.torsoLeanDeg > rule.largeTorsoLean ? "large" : "slight",
          parts: ["back"],
        });
      }
    }
    if (m.kneeAngleDeg !== undefined) {
      // 굽힌 깊이: 관절 부담이 크거나 무릎·허리가 불편한 사람에게는 얕게 시작하라고 권하므로, 이 경우에는 깊이로 다르다고 하지 않는다.
      if (!lenientDepth) {
        judged.push("thigh", "shin");
        if (m.kneeAngleDeg > rule.maxKneeAngle || m.kneeAngleDeg < rule.minKneeAngle) {
          issues.push({
            text: m.kneeAngleDeg > rule.maxKneeAngle ? "무릎을 굽힌 깊이가 정석보다 얕아요." : "무릎을 정석보다 많이 깊게 굽혔어요.",
            severity: m.kneeAngleDeg > rule.largeMaxKneeAngle ? "large" : "slight",
            parts: ["thigh", "shin"],
          });
        }
      }
      const depth = m.kneeAngleDeg <= 100 ? "깊게" : m.kneeAngleDeg <= 130 ? "보통으로" : "얕게";
      facts.push(`무릎을 ${depth} 굽혔어요.`);
    }
  } else {
    return null;
  }

  return judged.length > 0 ? { issues, judged, facts } : null;
}

/**
 * 측정값으로 자세를 판정한다. 판정할 수 있는 측정값이 없으면(몸을 못 찾음 등) null이고, 그때는 AI가 눈대중으로 판단한다.
 * 판정: 다른 점이 없으면 정석(similar), 하나면 조금 다름(slight), 둘 이상이거나 크게 다르면 많이 다름(large)
 */
export function judgeForm(exerciseId: ExerciseId, measurements: PoseMeasurements | undefined, profile?: Profile): FormJudgement | null {
  if (!measurements) return null;
  const lenientDepth = profile ? needsShallowDepth(profile) : false;
  const result = evaluate(exerciseId, measurements, lenientDepth);
  if (!result) return null;

  const { issues, judged, facts } = result;
  const bad = new Set(issues.flatMap((issue) => issue.parts));
  const verdict: Verdict =
    issues.length === 0 ? "similar" : issues.length >= 2 || issues.some((issue) => issue.severity === "large") ? "large" : "slight";

  return {
    verdict,
    parts: judged.map((part): OverlayItem => ({ part, kind: bad.has(part) ? "fix" : "good" })),
    issues: issues.map((issue) => issue.text),
    facts,
  };
}
