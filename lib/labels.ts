// 화면과 AI 지시문이 함께 쓰는 한국어 이름표. (Design Ref: §3 선택지)
// 한곳에 모아 두어 화면 글자와 AI에게 보내는 글자가 서로 달라지지 않게 한다.

import type { Experience, ExerciseId, InjuryPart } from "./types";

/** 운동 경험 */
export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: "처음",
  under1y: "1년 미만",
  over1y: "1년 이상",
};

/** 부상 이력·불편한 부위 */
export const INJURY_LABELS: Record<InjuryPart, string> = {
  knee: "무릎",
  back: "허리",
  shoulder: "어깨",
  ankle: "발목",
  wrist: "손목",
  neck: "목",
  other: "기타",
};

/** 운동 목록 ('기타'는 사용자가 직접 쓴 이름을 따로 쓴다) */
export const EXERCISE_LABELS: Record<ExerciseId, string> = {
  squat: "스쿼트",
  lunge: "런지",
  plank: "플랭크",
  pushup: "푸시업",
  bridge: "브릿지",
  other: "기타",
};
