// Design Ref: §3.1 — 입력 검사 규칙. 브라우저와 서버가 같은 규칙을 쓰도록 순수 함수로 만든다.
// 몸 정보 검사(PLAN 5번)와 피드백 요청 입력 검사(PLAN 9번)가 들어 있다.

import type { Experience, ExerciseId, Gender, InjuryPart, Profile } from "./types";

/** 체중 허용 범위 (kg, 초안) */
export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 300;
/** 키 허용 범위 (cm, 초안) */
export const HEIGHT_MIN_CM = 100;
export const HEIGHT_MAX_CM = 250;
/** 기타 부위 글자 수 상한 (서버 요청 검사 lib/schemas.ts와 같은 값) */
export const INJURY_OTHER_MAX_LENGTH = 50;

/** 몸 정보 입력 화면의 입력값 (아직 검사하지 않은 상태) */
export interface ProfileFormValues {
  /** 고르기 전에는 빈 문자열 */
  gender: Gender | "";
  /** 고르기 전에는 빈 문자열 */
  experience: Experience | "";
  /** "없음"을 고른 경우 true */
  noInjury: boolean;
  injuries: InjuryPart[];
  injuryOther: string;
  /** 입력한 그대로의 글자 */
  height: string;
  weight: string;
}

export type ProfileFieldName = "gender" | "experience" | "injuries" | "injuryOther" | "height" | "weight";
export type ProfileFieldErrors = Partial<Record<ProfileFieldName, string>>;

export type ProfileFormResult =
  | { ok: true; profile: Profile }
  | { ok: false; errors: ProfileFieldErrors };

/**
 * 몸 정보 입력값을 검사한다. (Design Ref: §3.1)
 * - 부상 이력: "없음"이면 부위가 비어 있어야 하고, 아니면 1개 이상 골라야 한다. "기타"를 고르면 직접 입력이 필수
 * - 체중: 20~300 사이 숫자
 * - 운동 경험: 필수
 */
export function validateProfileForm(values: ProfileFormValues): ProfileFormResult {
  const errors: ProfileFieldErrors = {};

  if (values.gender === "") {
    errors.gender = "성별을 골라 주세요.";
  }

  if (values.experience === "") {
    errors.experience = "운동 경험을 골라 주세요.";
  }

  if (values.noInjury) {
    if (values.injuries.length > 0) {
      errors.injuries = "'없음'은 다른 부위와 함께 고를 수 없어요.";
    }
  } else if (values.injuries.length === 0) {
    errors.injuries = "부상 이력이나 불편한 부위를 골라 주세요. 없으면 '없음'을 골라 주세요.";
  }

  const injuryOther = values.injuryOther.trim();
  if (values.injuries.includes("other") && injuryOther === "") {
    errors.injuryOther = "기타 부위를 입력해 주세요.";
  } else if (injuryOther.length > INJURY_OTHER_MAX_LENGTH) {
    errors.injuryOther = `기타 부위는 ${INJURY_OTHER_MAX_LENGTH}자 이내로 입력해 주세요.`;
  }

  const heightText = values.height.trim();
  const heightCm = heightText === "" ? Number.NaN : Number(heightText);
  if (!Number.isFinite(heightCm) || heightCm < HEIGHT_MIN_CM || heightCm > HEIGHT_MAX_CM) {
    errors.height = `키를 ${HEIGHT_MIN_CM}~${HEIGHT_MAX_CM}cm 사이 숫자로 입력해 주세요.`;
  }

  const weightText = values.weight.trim();
  const weightKg = weightText === "" ? Number.NaN : Number(weightText);
  if (!Number.isFinite(weightKg) || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) {
    errors.weight = `체중을 ${WEIGHT_MIN_KG}~${WEIGHT_MAX_KG}kg 사이 숫자로 입력해 주세요.`;
  }

  if (Object.keys(errors).length > 0 || values.experience === "" || values.gender === "") {
    return { ok: false, errors };
  }

  const injuries = values.noInjury ? [] : values.injuries;
  const profile: Profile = {
    gender: values.gender,
    experience: values.experience,
    noInjury: values.noInjury,
    injuries,
    heightCm,
    weightKg,
  };
  if (injuries.includes("other")) profile.injuryOther = injuryOther;

  return { ok: true, profile };
}

// ─────────────────────────────────────────────
// 피드백 요청 입력 검사 (홈 화면, PLAN 9번)
// ─────────────────────────────────────────────

/** 올릴 수 있는 사진 형식 (Design Ref: §3.1) */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** 줄이기 전 원본 사진 크기 상한 (바이트). 너무 큰 파일은 브라우저가 줄이다 멈출 수 있어 막는다. */
export const MAX_ORIGINAL_PHOTO_BYTES = 20 * 1024 * 1024;
export const MEMO_MAX_LENGTH = 500;
export const EXERCISE_OTHER_MAX_LENGTH = 50;

export const PHOTO_FORMAT_MESSAGE = "JPEG·PNG·WebP 사진을 올려 주세요.";

/** 사진 파일 하나의 형식·크기를 검사한다. 문제가 없으면 null, 있으면 안내 문구 */
export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return PHOTO_FORMAT_MESSAGE;
  if (file.size === 0) return "빈 사진입니다. 다른 사진을 골라 주세요.";
  if (file.size > MAX_ORIGINAL_PHOTO_BYTES) return "사진이 너무 커요. 20MB 이하 사진을 올려 주세요.";
  return null;
}

/** 홈 화면의 입력값 (아직 검사하지 않은 상태) */
export interface FeedbackFormValues {
  exerciseId: ExerciseId;
  exerciseOther: string;
  /** 사진을 고르지 않았으면 null */
  photo: { type: string; size: number } | null;
  memo: string;
}

export type FeedbackFieldName = "exerciseOther" | "photo" | "memo";
export type FeedbackFieldErrors = Partial<Record<FeedbackFieldName, string>>;

/** 홈 화면 입력을 검사한다. 오류가 없으면 빈 객체 (Design Ref: §3.1) */
export function validateFeedbackForm(values: FeedbackFormValues): FeedbackFieldErrors {
  const errors: FeedbackFieldErrors = {};

  if (values.exerciseId === "other") {
    const name = values.exerciseOther.trim();
    if (name === "") errors.exerciseOther = "운동 이름을 입력해 주세요.";
    else if (name.length > EXERCISE_OTHER_MAX_LENGTH) {
      errors.exerciseOther = `운동 이름은 ${EXERCISE_OTHER_MAX_LENGTH}자 이내로 입력해 주세요.`;
    }
  }

  if (!values.photo) errors.photo = "자세 사진을 올려 주세요.";
  else {
    const photoError = validatePhotoFile(values.photo);
    if (photoError) errors.photo = photoError;
  }

  if (values.memo.length > MEMO_MAX_LENGTH) {
    errors.memo = `메모는 ${MEMO_MAX_LENGTH}자 이내로 써 주세요.`;
  }

  return errors;
}
