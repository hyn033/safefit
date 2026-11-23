// Design Ref: §3.1, §4.2, §8.3 — 서버가 받는 요청과 AI의 답변이 약속한 모양인지 zod로 검사한다.
// 서버에서만 쓴다. (화면에서 쓰면 브라우저로 내려가는 코드가 늘어나므로 화면용 검사는 lib/validate.ts에 따로 둔다.)

import { z } from "zod";
import { EXERCISE_IDS, GENDERS, INJURY_PARTS, OVERLAY_PARTS } from "./types";
import { HEIGHT_MAX_CM, HEIGHT_MIN_CM, WEIGHT_MAX_KG, WEIGHT_MIN_KG } from "./validate";

/** 사진 data URL 허용 형식: JPEG·PNG·WebP (Design Ref: §3.1) */
const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

// ─────────────────────────────────────────────
// 요청 검사
// ─────────────────────────────────────────────

const profileSchema = z
  .object({
    gender: z.enum(GENDERS).optional(),
    noInjury: z.boolean(),
    injuries: z.array(z.enum(INJURY_PARTS)).max(INJURY_PARTS.length),
    injuryOther: z.string().trim().max(50).optional(),
    heightCm: z.number().min(HEIGHT_MIN_CM).max(HEIGHT_MAX_CM).optional(),
    weightKg: z.number().min(WEIGHT_MIN_KG).max(WEIGHT_MAX_KG),
  })
  .superRefine((profile, ctx) => {
    // 부상 이력: "없음"이면 부위가 비어 있고, 아니면 1개 이상. 부위는 중복 없이.
    if (profile.noInjury && profile.injuries.length > 0) {
      ctx.addIssue({ code: "custom", path: ["injuries"], message: "noInjury와 injuries가 함께 있음" });
    }
    if (!profile.noInjury && profile.injuries.length === 0) {
      ctx.addIssue({ code: "custom", path: ["injuries"], message: "부상 이력이 비어 있음" });
    }
    if (new Set(profile.injuries).size !== profile.injuries.length) {
      ctx.addIssue({ code: "custom", path: ["injuries"], message: "부위가 중복됨" });
    }
    // 기타 부위를 고르면 직접 입력이 필수
    if (profile.injuries.includes("other") && !profile.injuryOther) {
      ctx.addIssue({ code: "custom", path: ["injuryOther"], message: "기타 부위 입력이 없음" });
    }
  });

export const feedbackRequestSchema = z
  .object({
    exerciseId: z.enum(EXERCISE_IDS),
    exerciseOther: z.string().trim().max(50).optional(),
    memo: z.string().max(500),
    profile: profileSchema,
    imageDataUrl: z.string().max(3_000_000).regex(IMAGE_DATA_URL),
    exerciseConfirmed: z.boolean().optional(),
    measurements: z
      .object({
        reference: z.enum(["ankle", "knee"]),
        lineAngleDeg: z.number().min(0).max(180),
        hipOffsetPct: z.number().min(-100).max(100),
      })
      .optional(),
  })
  .superRefine((request, ctx) => {
    if (request.exerciseId === "other" && !request.exerciseOther) {
      ctx.addIssue({ code: "custom", path: ["exerciseOther"], message: "기타 운동 이름이 없음" });
    }
  });

// ─────────────────────────────────────────────
// AI 답변 검사
// ─────────────────────────────────────────────

/** 모델은 빈 항목을 null로 주는 일이 많으므로 null도 "없음"으로 받아들인다. */
const optionalText = (max: number) => z.string().max(max).nullish();
const textList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().max(maxLength))
    .nullish()
    // 항목이 더 많으면 앞에서부터 잘라 쓴다. (수정 방법은 최대 3가지)
    .transform((items) => (items ? items.slice(0, maxItems) : items));

/** 모델은 쓰지 않는 항목을 빈 글자("")로 채우기도 하므로, 빈 글자는 "없음"으로 본다. */
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

/** 부위 하나의 비교 결과 */
const overlayItemSchema = z.object({
  part: z.enum(OVERLAY_PARTS),
  kind: z.enum(["good", "fix"]),
});

/**
 * 부위별 결과 목록. 모양이 틀린 항목은 답변 전체를 실패시키지 않고 그 항목만 버린다. (선은 덤이라 없어도 피드백은 보여 줄 수 있다)
 * 같은 부위가 여러 번 나오면 앞의 것만 쓴다.
 */
const overlaySchema = z
  .array(z.unknown())
  .nullish()
  .transform((items) => {
    const seen = new Set<string>();
    return (items ?? [])
      .map((item) => overlayItemSchema.safeParse(item))
      .flatMap((parsed) => (parsed.success && !seen.has(parsed.data.part) && seen.add(parsed.data.part) ? [parsed.data] : []));
  });

export const aiAnswerSchema = z
  .object({
    status: z.enum(["ok", "retake", "mismatch"]),
    verdict: z.preprocess(emptyToUndefined, z.enum(["similar", "slight", "large"]).nullish()),
    assessment: optionalText(300),
    differences: textList(6, 200),
    problemParts: textList(6, 100),
    fixes: textList(3, 300),
    memoAnswer: optionalText(600),
    overlay: overlaySchema,
    uncertain: z.boolean().nullish(),
  })
  .superRefine((answer, ctx) => {
    // 정상(ok) 답변에는 차이 단계와 요약이 있어야 화면에 보여 줄 수 있다.
    if (answer.status === "ok") {
      if (!answer.verdict) ctx.addIssue({ code: "custom", path: ["verdict"], message: "차이 단계가 없음" });
      if (!answer.assessment) ctx.addIssue({ code: "custom", path: ["assessment"], message: "요약이 없음" });
    }
  });

export type AiAnswer = z.infer<typeof aiAnswerSchema>;
