// Design Ref: §4.4 — 안전 규칙. 통증·심한 증상 감지, 부상 부위 주의, 진단·체중 비난 표현 차단. (PLAN 11번)
// 브라우저와 서버가 같은 규칙을 쓰도록 브라우저 전용·서버 전용 코드를 import하지 않는 순수 함수로 만든다.
// 감지 목록은 초안이며 전문가 확인이 필요하다. 놓치는 것보다 과하게 잡는 쪽이 안전하므로 넓게 잡는다.

import { INJURY_LABELS } from "./labels";
import type { ExerciseId, InjuryPart, Profile } from "./types";

// ─────────────────────────────────────────────
// 메모에서 통증·심한 증상 감지
// ─────────────────────────────────────────────

/** 통증·불편 어간 (Design Ref: §4.4) */
export const PAIN_STEMS = ["아프", "아파", "아픈", "아픔", "통증", "쑤시", "쑤셔", "저리", "저려", "찌릿", "불편"] as const;

/** 띄어쓰기가 달라도 잡히도록 공백을 모두 지운다. */
function compact(text: string): string {
  return text.replace(/\s+/g, "");
}

/** 메모에 통증·불편 표현이 있으면 true */
export function detectPain(memo: string): boolean {
  const text = compact(memo);
  return PAIN_STEMS.some((stem) => text.includes(stem));
}

/**
 * 메모에 심한 증상 표현이 있으면 true. 하나라도 해당하면 심한 증상으로 본다.
 * ① 가슴 + 통증·불편 어간, ② 어지러·어지럽, ③ 심한 + 부기·붓·부어, ④ 숨이 차·숨쉬기 힘
 */
export function detectSevere(memo: string): boolean {
  const text = compact(memo);
  if (text.includes("가슴") && detectPain(memo)) return true;
  if (text.includes("어지러") || text.includes("어지럽")) return true;
  if (/심(한|하게).{0,10}(부기|붓|부어)/.test(text)) return true;
  if (text.includes("숨이차") || text.includes("숨쉬기힘")) return true;
  return false;
}

// ─────────────────────────────────────────────
// 부상 부위 주의
// ─────────────────────────────────────────────

/** 운동별 관련 부위 (초안). '기타' 운동은 목록이 없고, 입력된 부상 부위를 모두 붙인다. */
const EXERCISE_RELATED_PARTS: Record<Exclude<ExerciseId, "other">, InjuryPart[]> = {
  squat: ["knee", "back", "ankle"],
  lunge: ["knee", "ankle", "back"],
  plank: ["back", "shoulder", "wrist", "neck"],
  bridge: ["back", "knee", "neck"],
};

/** 부위 이름 ('기타'는 사용자가 쓴 글자 그대로) */
function partName(part: InjuryPart, profile: Profile): string {
  return part === "other" ? (profile.injuryOther ?? INJURY_LABELS.other) : INJURY_LABELS[part];
}

/**
 * 주의가 필요한 부상 부위 이름 목록. 없으면 undefined.
 * 운동이 '기타'이거나 부상 부위에 '기타'가 있으면 입력된 부상 부위 전체를 붙인다. (AI의 판단에 맡기지 않는다.)
 */
export function getInjuryParts(exerciseId: ExerciseId, profile: Profile): string[] | undefined {
  if (profile.noInjury || profile.injuries.length === 0) return undefined;

  const all = exerciseId === "other" || profile.injuries.includes("other");
  const related = exerciseId === "other" ? [] : EXERCISE_RELATED_PARTS[exerciseId];
  const parts = profile.injuries.filter((part) => all || related.includes(part));
  return parts.length > 0 ? parts.map((part) => partName(part, profile)) : undefined;
}

// ─────────────────────────────────────────────
// AI 답변의 문제 표현 차단
// ─────────────────────────────────────────────

/** 진단·치료 표현 (초안) */
const DIAGNOSIS_WORDS = ["진단", "치료", "처방", "재활", "염증", "디스크", "관절염", "파열", "탈구", "골절", "질환", "증후군"];

/** 체중을 이유로 한 외모 평가·비난성 표현 (초안) */
const WEIGHT_BLAME_PATTERNS = [/(체중|몸무게|살|뱃살|비만).{0,8}(때문|탓)/, /뚱뚱|비만|과체중|살찐|살이쪄|살이찐|살쪘/];

/** 글에 진단·치료 표현이나 체중 비난 표현이 있으면 true */
export function hasBannedExpression(text: string): boolean {
  const compacted = compact(text);
  if (DIAGNOSIS_WORDS.some((word) => compacted.includes(word))) return true;
  return WEIGHT_BLAME_PATTERNS.some((pattern) => pattern.test(compacted));
}

/** 피드백 글 항목들 */
interface AnswerTexts {
  assessment?: string | null;
  differences?: string[] | null;
  problemParts?: string[] | null;
  fixes?: string[] | null;
}

/** 답변 안에 문제 표현이 하나라도 있으면 true */
export function answerHasBannedExpression(answer: AnswerTexts): boolean {
  const texts = [answer.assessment ?? "", ...(answer.differences ?? []), ...(answer.problemParts ?? []), ...(answer.fixes ?? [])];
  return texts.some(hasBannedExpression);
}

/** 문제 표현이 들어 있는 문장(항목)을 지운다. 요약(assessment)에 있으면 지우고 null로 둔다. */
export function removeBannedExpressions<T extends AnswerTexts>(answer: T): T {
  const keep = (items: string[] | null | undefined) => (items ? items.filter((item) => !hasBannedExpression(item)) : items);
  return {
    ...answer,
    assessment: answer.assessment && hasBannedExpression(answer.assessment) ? null : answer.assessment,
    differences: keep(answer.differences),
    problemParts: keep(answer.problemParts),
    fixes: keep(answer.fixes),
  };
}
