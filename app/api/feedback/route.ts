// Design Ref: §4 서버 API — POST /api/feedback (PLAN 6번 뼈대)
// 사진·메모·몸 정보를 받아 AI에게 자세를 묻고 피드백 결과를 돌려준다.
// 사진은 서버에 저장하지 않고, 로그에도 남기지 않는다. API 키는 서버에서만 읽는다. (Design Ref: §7)

import { FeedbackApiError, requestAiAnswer, SERVER_DEADLINE_MS } from "@/lib/ai";
import { toFeedbackResponse, toSevereResponse } from "@/lib/feedback";
import { detectSevere } from "@/lib/safety";
import { feedbackRequestSchema } from "@/lib/schemas";
import { API_ERROR_CODES } from "@/lib/types";
import type { ApiErrorCode, ApiErrorResponse } from "@/lib/types";

// Design Ref: §4.3 — 서버 함수 최대 실행 시간 30초 (서버 전체 마감 28초보다 조금 길게)
export const maxDuration = 30;

/** 요청 본문 최대 크기: 3MB (Design Ref: §3.1) */
const MAX_BODY_BYTES = 3 * 1024 * 1024;

/** 사용자에게 보여 줄 오류 안내 문구 */
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_INPUT: "입력 내용을 확인해 주세요.",
  IMAGE_TOO_LARGE: "사진이 너무 커요. 더 작은 사진으로 다시 시도해 주세요.",
  AI_FAILED: "잠시 문제가 생겼어요. 다시 시도해 주세요.",
  AI_TIMEOUT: "시간이 오래 걸리고 있어요. 다시 시도해 주세요.",
  SERVER_ERROR: "잠시 문제가 생겼어요. 다시 시도해 주세요.",
};

/** 오류 응답을 만든다. (요청에 담긴 사진·메모·몸 정보는 응답에도 되돌려 주지 않는다.) */
function errorResponse(code: ApiErrorCode): Response {
  const body: ApiErrorResponse = { error: { code, message: ERROR_MESSAGES[code] } };
  return Response.json(body, { status: API_ERROR_CODES[code] });
}

export async function POST(request: Request): Promise<Response> {
  // 서버 전체 마감 시각을 먼저 정한다. (Design Ref: §4.3 — 28초를 넘으면 직접 504를 돌려준다)
  const deadlineAt = Date.now() + SERVER_DEADLINE_MS;

  try {
    // 크기: 선언된 크기를 먼저 보고, 실제로 읽은 크기도 다시 확인한다.
    const declaredBytes = Number(request.headers.get("content-length") ?? 0);
    if (declaredBytes > MAX_BODY_BYTES) return errorResponse("IMAGE_TOO_LARGE");

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return errorResponse("IMAGE_TOO_LARGE");

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return errorResponse("INVALID_INPUT");
    }

    const parsed = feedbackRequestSchema.safeParse(json);
    if (!parsed.success) return errorResponse("INVALID_INPUT");

    // 심한 증상 표현이 있으면(직접 호출 대비) AI를 부르지 않고 안내만 돌려준다.
    if (detectSevere(parsed.data.memo)) return Response.json(toSevereResponse(parsed.data));

    const answer = await requestAiAnswer(parsed.data, deadlineAt);
    return Response.json(toFeedbackResponse(parsed.data, answer));
  } catch (error) {
    if (error instanceof FeedbackApiError) return errorResponse(error.code);
    // 요청 내용이 로그에 남지 않도록 오류 종류만 기록한다.
    console.error("[feedback] 예상하지 못한 오류", { name: error instanceof Error ? error.name : "unknown" });
    return errorResponse("SERVER_ERROR");
  }
}
