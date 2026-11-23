// 몸 인식으로 잰 측정값을 보고 자세가 정석과 같은지 코드가 판정한다. (AI의 눈대중 대신)
// 판정(정석/조금 다름/많이 다름)과 어느 부위가 다른지는 여기서 정하고, AI는 그 결과를 쉬운 말로 풀어 쓰며 몸 정보에 맞는 안내를 한다.
//
// 기준 값은 초안이다. 정석 예시 사진 8장(남·여 × 4가지 운동)이 여유 있게 "정석"으로 나오도록 잡았고,
// 실제 정석 범위는 전문가 확인이 필요하다.

import type { ExerciseId, OverlayItem, OverlayPart, PoseMeasurements, Verdict } from "./types";

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
const PLANK = { minLineAngle: 158, maxHipOffset: 10, largeLineAngle: 145, largeHipOffset: 18, maxElbowOffset: 20 };
const BRIDGE = { minLineAngle: 160, maxHipOffset: 12, largeLineAngle: 145, minKneeAngle: 50, maxKneeAngle: 110 };
const SQUAT = { maxTorsoLean: 55, largeTorsoLean: 70 };
const LUNGE = { maxTorsoLean: 25, largeTorsoLean: 40 };

/** 판정에 쓸 수 있는 측정값이 있는 운동인지 */
function evaluate(exerciseId: ExerciseId, m: PoseMeasurements): { issues: FormIssue[]; judged: OverlayPart[]; facts: string[] } | null {
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
    // 굽힌 깊이는 정석 여부를 가리지 않고, 몸에 맞는 안내(얕게 시작하기 등)에 참고하도록 AI에게만 알려 준다.
    if (m.kneeAngleDeg !== undefined) {
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
export function judgeForm(exerciseId: ExerciseId, measurements: PoseMeasurements | undefined): FormJudgement | null {
  if (!measurements) return null;
  const result = evaluate(exerciseId, measurements);
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
