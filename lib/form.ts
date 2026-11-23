// 내 사진과 정석 예시 사진의 몸 선을 비교한 결과(각도 차이)를 보고 자세가 정석과 같은지 코드가 판정한다. (AI의 눈대중 대신)
// 판정(정석/조금 다름/많이 다름)과 어느 부위가 다른지는 여기서 정하고, AI는 그 결과를 쉬운 말로 풀어 쓰며 몸 정보에 맞는 안내를 한다.
//
// 기준 값은 초안이다. 같은 자세를 다른 사람이 찍은 정석 사진끼리 비교해도 "같음"이 나오도록 잡았고,
// 실제 허용 범위는 전문가 확인이 필요하다.

import type { OverlayItem, OverlayPart, PoseComparison, Verdict } from "./types";

/**
 * 부위 각도가 정석과 이만큼(도)까지 다르면 같은 것으로 본다. (사람마다 몸 비율·카메라 기울기가 조금씩 달라서 여유를 둔다)
 * 다리가 자세의 핵심이라 다리(허벅지·정강이)는 더 민감하게 본다. 정석 사진을 남녀가 찍은 것끼리 비교하면 등 0~2도, 다리 0~6도 차이였다.
 */
export const SAME_WITHIN_DEG: Record<OverlayPart, number> = { back: 20, thigh: 15, shin: 15, arm: 25, neck: 25 };
/** 이만큼(도) 넘게 다르면 크게 다른 것으로 본다. */
export const FAR_OVER_DEG = 50;

/** 정석과 다를 때 사용자에게 보여 줄 쉬운 말 (숫자 없이) */
const ISSUE_TEXTS: Record<OverlayPart, string> = {
  arm: "팔의 위치가 정석과 달라요.",
  back: "상체(등)의 각도가 정석과 달라요.",
  thigh: "허벅지의 각도가 정석과 달라요.",
  shin: "정강이의 각도가 정석과 달라요.",
  neck: "목의 각도가 정석과 달라요.",
};

/** 코드가 내린 자세 판정 */
export interface FormJudgement {
  verdict: Verdict;
  /** 비교한 부위별 결과 (같으면 good, 다르면 fix) */
  parts: OverlayItem[];
  /** 정석과 다른 점 (없으면 빈 목록) */
  issues: string[];
}

/**
 * 비교 결과로 자세를 판정한다. 비교 결과가 없으면(몸을 못 찾음 등) null이고, 그때는 AI가 눈대중으로 판단한다.
 * 판정: 다른 부위가 없으면 정석(similar), 하나면 조금 다름(slight), 둘 이상이거나 크게 다르면 많이 다름(large)
 */
export function judgeComparison(comparison: PoseComparison | undefined): FormJudgement | null {
  if (!comparison || comparison.parts.length === 0) return null;
  const different = comparison.parts.filter((item) => item.deltaDeg > SAME_WITHIN_DEG[item.part]);
  const verdict: Verdict =
    different.length === 0 ? "similar" : different.length >= 2 || different.some((item) => item.deltaDeg > FAR_OVER_DEG) ? "large" : "slight";
  return {
    verdict,
    parts: comparison.parts.map((item): OverlayItem => ({ part: item.part, kind: item.deltaDeg > SAME_WITHIN_DEG[item.part] ? "fix" : "good" })),
    issues: different.map((item) => ISSUE_TEXTS[item.part]),
  };
}
