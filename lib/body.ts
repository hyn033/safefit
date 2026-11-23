// Design Ref: §4.4 — 키와 체중으로 체질량지수(BMI)를 계산해 관절 부담 단계를 정한다.
// AI의 판단에 맡기지 않고 코드가 정한다. 화면과 AI 지시문에서는 체중·BMI를 이유로 들지 않고 "관절 부담"이라고만 말한다.
// 기준(초안, 전문가 확인 필요): 대한비만학회 BMI 23 이상 과체중, 30 이상 2단계 이상 비만.

import type { Profile } from "./types";

/** 관절 부담 단계: 보통 / 주의(BMI 23 이상) / 높음(BMI 30 이상) */
export type BodyLoad = "normal" | "caution" | "high";

export const BMI_CAUTION = 23;
export const BMI_HIGH = 30;

/** 체질량지수. 키가 없으면(예전에 저장된 몸 정보) null */
export function calcBmi(profile: Profile): number | null {
  if (!profile.heightCm) return null;
  const meter = profile.heightCm / 100;
  return Math.round((profile.weightKg / (meter * meter)) * 10) / 10;
}

/** 관절 부담 단계. 키를 모르면 보통으로 본다. */
export function getBodyLoad(profile: Profile): BodyLoad {
  const bmi = calcBmi(profile);
  if (bmi === null) return "normal";
  if (bmi >= BMI_HIGH) return "high";
  if (bmi >= BMI_CAUTION) return "caution";
  return "normal";
}

export const BODY_LOAD_LABELS: Record<BodyLoad, string> = { normal: "보통", caution: "주의", high: "높음" };
