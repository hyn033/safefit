// Design Ref: §3, §4.4 — AI 답변과 코드가 붙이는 안내를 합쳐 화면에 줄 피드백 결과를 만든다.
// 통증·심한 증상·부상 부위 주의 같은 안전 안내는 PLAN 11번(lib/safety.ts)에서 이어서 붙인다.

import type { AiAnswer } from "./schemas";
import type { FeedbackRequest, FeedbackResponse } from "./types";

export function toFeedbackResponse(request: FeedbackRequest, answer: AiAnswer): FeedbackResponse {
  const base = {
    status: answer.status,
    // AI 분석 주의 문구와 "의료 진단 아님" 문구는 AI 답변과 무관하게 항상 붙인다.
    notices: { aiCaution: true, notMedical: true } as const,
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
    uncertain: answer.uncertain ?? undefined,
  };
}
