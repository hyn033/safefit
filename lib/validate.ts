// Design Ref: §3.1 — 입력 검사 규칙. 브라우저와 서버가 같은 규칙을 쓰도록 순수 함수로 만든다.
// 지금은 몸 정보 입력 화면(PLAN 5번)에 필요한 검사만 있고, 사진·요청 검사는 PLAN 9번에서 이어서 추가한다.

import type { Experience, InjuryPart, Profile } from "./types";

/** 체중 허용 범위 (kg, 초안) */
export const WEIGHT_MIN_KG = 20;
export const WEIGHT_MAX_KG = 300;

/** 몸 정보 입력 화면의 입력값 (아직 검사하지 않은 상태) */
export interface ProfileFormValues {
  /** 고르기 전에는 빈 문자열 */
  experience: Experience | "";
  /** "없음"을 고른 경우 true */
  noInjury: boolean;
  injuries: InjuryPart[];
  injuryOther: string;
  /** 입력한 그대로의 글자 */
  weight: string;
}

export type ProfileFieldName = "experience" | "injuries" | "injuryOther" | "weight";
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
  }

  const weightText = values.weight.trim();
  const weightKg = weightText === "" ? Number.NaN : Number(weightText);
  if (!Number.isFinite(weightKg) || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) {
    errors.weight = `체중을 ${WEIGHT_MIN_KG}~${WEIGHT_MAX_KG}kg 사이 숫자로 입력해 주세요.`;
  }

  if (Object.keys(errors).length > 0 || values.experience === "") {
    return { ok: false, errors };
  }

  const injuries = values.noInjury ? [] : values.injuries;
  const profile: Profile = {
    experience: values.experience,
    noInjury: values.noInjury,
    injuries,
    weightKg,
  };
  if (injuries.includes("other")) profile.injuryOther = injuryOther;

  return { ok: true, profile };
}
