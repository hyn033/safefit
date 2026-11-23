// Design Ref: §3, §4.4 — AI 답변과 코드가 붙이는 안내를 합쳐 화면에 줄 피드백 결과를 만든다.
// 통증·심한 증상·부상 부위 주의 같은 안전 안내는 AI 답변과 무관하게 lib/safety.ts의 규칙으로 코드가 붙인다. (PLAN 11번)

import { getBodyLoad } from "./body";
import { detectPain, detectSevere, getInjuryParts } from "./safety";
import type { AiAnswer } from "./schemas";
import type { FeedbackNotices, FeedbackRequest, FeedbackResponse, OverlayItem, OverlayPart } from "./types";

/** 정석(similar)일 때 초록 선으로 보여 줄 부위. AI가 따로 말하지 않은 부위는 정석과 같은 것으로 본다. */
const GOOD_OVERLAY_PARTS: OverlayPart[] = ["arm", "back", "thigh", "shin"];

/** 사진 위에 그을 부위별 결과. 정석이면 AI가 선을 주지 않아도 몸 전체를 초록으로 보여 준다. */
function buildOverlay(answer: AiAnswer): OverlayItem[] | undefined {
  const items = answer.overlay ?? [];
  if (answer.verdict !== "similar") return items.length > 0 ? items : undefined;
  const given = new Set(items.map((item) => item.part));
  return [...items, ...GOOD_OVERLAY_PARTS.filter((part) => !given.has(part)).map((part): OverlayItem => ({ part, kind: "good" }))];
}

/** 코드가 항상 붙이는 안내. AI 주의·의료 아님은 항상, 통증·심한 증상·부상 부위는 해당할 때만 붙인다. */
function buildNotices(request: FeedbackRequest): FeedbackNotices {
  const notices: FeedbackNotices = { aiCaution: true, notMedical: true };
  const severe = detectSevere(request.memo);
  // 심한 증상 표현에는 통증 표현도 함께 있는 것으로 보고 통증 안내도 붙인다.
  if (severe || detectPain(request.memo)) notices.pain = true;
  if (severe) notices.severe = true;
  const injuryParts = getInjuryParts(request.exerciseId, request.profile);
  if (injuryParts) notices.injuryParts = injuryParts;
  // 관절 부담이 큰 몸 조건에서 굽히는 운동이면 깊이를 얕게 시작하라는 안내를 코드가 붙인다.
  if (getBodyLoad(request.profile) !== "normal" && (request.exerciseId === "squat" || request.exerciseId === "lunge")) {
    notices.jointCare = true;
  }
  return notices;
}

/** 심한 증상일 때의 결과: AI를 부르지 않고 안내만 담는다. 자세 피드백은 없다. */
export function toSevereResponse(request: FeedbackRequest): FeedbackResponse {
  return { status: "severe", notices: buildNotices(request), beta: request.exerciseId === "other" };
}

/** 측정 숫자(각도 도, 퍼센트)가 그대로 들어간 문장 */
const MEASURE_NUMBER = /d+(?:.d+)?s*(?:도|%|퍼센트)/;

/** 측정값을 보낸 요청이면, AI가 측정 숫자를 그대로 쓴 문장은 화면에 보이지 않게 뺀다. (정밀한 숫자는 말하지 않는 규칙) */
function withoutMeasureNumbers(request: FeedbackRequest, items: string[] | null | undefined): string[] | undefined {
  if (!items) return undefined;
  return request.measurements ? items.filter((item) => !MEASURE_NUMBER.test(item)) : items;
}

export function toFeedbackResponse(request: FeedbackRequest, answer: AiAnswer): FeedbackResponse {
  const base = {
    status: answer.status,
    notices: buildNotices(request),
    // 목록에 없는 '기타' 운동은 안내 카드가 없으므로 베타로 표시한다.
    beta: request.exerciseId === "other",
  };

  // 다시 촬영·불일치 확인일 때는 분석 내용을 보여 주지 않는다.
  if (answer.status !== "ok") return base;

  return {
    ...base,
    verdict: answer.verdict ?? undefined,
    assessment: answer.assessment ?? undefined,
    differences: withoutMeasureNumbers(request, answer.differences),
    problemParts: withoutMeasureNumbers(request, answer.problemParts),
    fixes: withoutMeasureNumbers(request, answer.fixes),
    memoAnswer: answer.memoAnswer ?? undefined,
    overlay: buildOverlay(answer),
    uncertain: answer.uncertain ?? undefined,
  };
}
