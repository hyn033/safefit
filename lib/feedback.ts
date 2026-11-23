// Design Ref: §3, §4.4 — AI 답변과 코드가 붙이는 안내를 합쳐 화면에 줄 피드백 결과를 만든다.
// 통증·심한 증상·부상 부위 주의 같은 안전 안내는 AI 답변과 무관하게 lib/safety.ts의 규칙으로 코드가 붙인다. (PLAN 11번)

import { getBodyLoad } from "./body";
import { detectPain, detectSevere, getInjuryParts } from "./safety";
import type { AiAnswer } from "./schemas";
import type { FeedbackNotices, FeedbackRequest, FeedbackResponse } from "./types";

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
    differences: answer.differences ?? undefined,
    problemParts: answer.problemParts ?? undefined,
    fixes: answer.fixes ?? undefined,
    memoAnswer: answer.memoAnswer ?? undefined,
    uncertain: answer.uncertain ?? undefined,
  };
}
