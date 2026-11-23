// Design Ref: §4.3 시간 예산, §4.2 오류 — 외부 AI 서비스를 서버에서 호출한다. (PLAN 6번 뼈대)
// API 키는 서버 환경변수(.env의 OPENAI_API_KEY)에서만 읽는다. 브라우저로 내려가는 코드에서 이 파일을 쓰면 안 된다.
// 사진·메모·몸 정보는 저장하지 않고, 오류 로그에도 남기지 않는다. (Design Ref: §7)

import OpenAI, { APIConnectionTimeoutError, APIError } from "openai";
import { buildUserText, SYSTEM_PROMPT } from "./prompt";
import { answerHasBannedExpression, removeBannedExpressions } from "./safety";
import { aiAnswerSchema } from "./schemas";
import type { AiAnswer } from "./schemas";
import type { ApiErrorCode, FeedbackRequest } from "./types";

/**
 * 기본 모델. PRD 8번에서 "개발 단계에서 선정"하기로 한 부분이며, 사진을 이해하는 모델이어야 한다.
 * 서버 환경변수 OPENAI_MODEL로 바꿀 수 있다. (품질·응답 시간은 PLAN 10·16번에서 확인하며 정한다.)
 */
export const DEFAULT_MODEL = "gpt-4o-mini";

/** 서버 전체 마감 28초 / AI 1차 호출 최대 20초 / 재시도는 남은 시간이 10초 이상일 때만 (Design Ref: §4.3) */
export const SERVER_DEADLINE_MS = 28_000;
export const AI_FIRST_CALL_MS = 20_000;
export const RETRY_MIN_REMAINING_MS = 10_000;

/** 사용자에게 알려 줄 오류 종류를 담은 오류 */
export class FeedbackApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode) {
    super(code);
    this.name = "FeedbackApiError";
    this.code = code;
  }
}

/** AI에게 한 번 물어보고 답변 글을 받는다. 시간 초과·호출 실패는 FeedbackApiError로 바꿔 던진다. */
async function askModel(
  client: OpenAI,
  model: string,
  request: FeedbackRequest,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: buildUserText(request) },
              { type: "image_url", image_url: { url: request.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 900,
        // 같은 사진에 매번 다른 판정이 나오지 않도록 답변의 흔들림을 최대한 줄인다. (gpt-4 계열만 지원하는 값이라 다른 모델은 생략)
        ...(model.startsWith("gpt-4") ? { temperature: 0, seed: 7 } : {}),
      },
      { timeout: timeoutMs },
    );
    return completion.choices[0]?.message?.content ?? null;
  } catch (error) {
    if (error instanceof APIConnectionTimeoutError) throw new FeedbackApiError("AI_TIMEOUT");
    // 요청 내용이 로그에 남지 않도록 오류 종류와 상태 번호만 기록한다.
    const status = error instanceof APIError ? error.status : undefined;
    console.error("[feedback] AI 호출 실패", { name: error instanceof Error ? error.name : "unknown", status });
    throw new FeedbackApiError("AI_FAILED");
  }
}

/** AI 답변 글이 약속한 모양이면 돌려주고, 아니면 null */
function parseAnswer(text: string | null): AiAnswer | null {
  if (!text) return null;
  try {
    const result = aiAnswerSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** 정상(ok) 답변인데 요약이나 수정 방법이 비어 있으면 화면에 보여 줄 내용이 부족한 것이다. */
function isInsufficient(answer: AiAnswer): boolean {
  return answer.status === "ok" && (!answer.assessment || !answer.fixes || answer.fixes.length === 0);
}

/**
 * AI에게 자세를 물어 약속한 모양의 답변을 받는다.
 * 답변 모양이 어긋나거나 진단·체중 비난 표현이 있으면 남은 시간이 충분할 때만 1회 다시 묻는다. (Design Ref: §4.3, §4.4)
 * 다시 물은 뒤에도 문제 표현이 남으면 그 문장을 지우고, 남은 내용이 부족하면 AI_FAILED로 처리한다.
 * @param deadlineAt 서버 전체 마감 시각 (Date.now() 기준 밀리초)
 */
export async function requestAiAnswer(request: FeedbackRequest, deadlineAt: number): Promise<AiAnswer> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new FeedbackApiError("SERVER_ERROR");

  const client = new OpenAI({ apiKey, maxRetries: 0 });
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  // 모양은 맞지만 문제 표현이 있는 답변 (재시도가 불가능하거나 실패했을 때 문장을 지워서 쓴다)
  let flawed: AiAnswer | null = null;
  // 사용자가 운동을 확인했는데도 AI가 불일치로 답한 경우 (Design Ref: §4.4 — 확인된 요청은 불일치 판정을 건너뛴다)
  let wronglyMismatched: AiAnswer | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const remaining = deadlineAt - Date.now();
    if (attempt === 2 && remaining < RETRY_MIN_REMAINING_MS) break;
    if (remaining <= 0) throw new FeedbackApiError("AI_TIMEOUT");

    const timeoutMs = attempt === 1 ? Math.min(AI_FIRST_CALL_MS, remaining) : remaining;
    const answer = parseAnswer(await askModel(client, model, request, timeoutMs));
    if (!answer) continue;
    if (request.exerciseConfirmed && answer.status === "mismatch") {
      wronglyMismatched = answer;
      continue;
    }
    // 다시 촬영·불일치 답변은 분석 내용을 쓰지 않으므로 표현 검사가 필요 없다.
    if (answer.status !== "ok" || !answerHasBannedExpression(answer)) return answer;
    flawed = answer;
  }

  if (flawed) {
    const cleaned = removeBannedExpressions(flawed);
    if (!isInsufficient(cleaned)) return cleaned;
  }
  // 확인된 운동인데 계속 불일치로 답하면 사진으로 자세를 확인하기 어려운 것이므로 "다시 촬영"으로 안내한다.
  if (wronglyMismatched) return { ...wronglyMismatched, status: "retake" };
  throw new FeedbackApiError("AI_FAILED");
}
