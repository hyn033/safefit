// Design Ref: §4.6 — 운동 안내 데이터. AI가 매번 만들지 않고 미리 정해 둔 고정 내용을 쓴다.
// 주의: 문구와 카메라 수치는 초안이며 전문가 확인이 필요하다. (PLAN 7번)
// 예시 이미지를 실제 사진으로 바꿀 때는 imagePath만 고치면 된다.

import type { ExerciseId } from "./types";

export interface ExerciseGuide {
  id: ExerciseId;
  name: string;
  /** 하는 법 (4줄 이내). '기타'는 안내가 없으므로 빈 목록 */
  steps: string[];
  /** 사진을 찍을 순간 */
  shootMoment: string;
  /** 카메라 위치 안내 한 줄 */
  cameraNote: string;
  /** 예시 이미지 경로 (public/guide/…) */
  imagePath: string;
  /** 이미지 대체 텍스트 */
  imageAlt: string;
}

/** 모든 운동 안내에 함께 보여 주는 공통 문구 */
export const COMMON_GUIDE_NOTES = [
  "혼자 찍기 어려우면 폰을 세워 타이머로 찍거나 다른 사람에게 부탁하세요.",
  "아프면 바로 멈추세요.",
] as const;

export const EXERCISE_GUIDES: Record<ExerciseId, ExerciseGuide> = {
  squat: {
    id: "squat",
    name: "스쿼트",
    steps: [
      "발을 어깨너비로 벌리고 서요.",
      "엉덩이를 뒤로 빼며 앉아요.",
      "무릎은 발끝 방향을 유지해요.",
      "가슴을 펴고 허리가 말리지 않게 해요.",
    ],
    shootMoment: "가장 깊이 앉은 순간",
    cameraNote: "옆에서 전신이 보이게, 폰을 허리 높이에 두고 2~3m 떨어져서 찍어요.",
    imagePath: "/guide/squat.svg",
    imageAlt: "옆에서 본 스쿼트 자세와 허리 높이에 놓은 카메라 위치를 그린 그림",
  },
  lunge: {
    id: "lunge",
    name: "런지",
    steps: [
      "한 발을 앞으로 크게 내딛어요.",
      "상체를 곧게 세우고 뒷무릎을 바닥 쪽으로 내려요.",
      "앞무릎은 발끝 방향을 유지해요.",
      "앞발로 밀어 올라와요.",
    ],
    shootMoment: "앞무릎이 가장 많이 굽혀진 순간",
    cameraNote: "옆에서 전신이 보이게, 폰을 허리 높이에 두고 2~3m 떨어져서 찍어요.",
    imagePath: "/guide/lunge.svg",
    imageAlt: "옆에서 본 런지 자세와 허리 높이에 놓은 카메라 위치를 그린 그림",
  },
  plank: {
    id: "plank",
    name: "플랭크",
    steps: [
      "팔꿈치를 어깨 아래에 두고 엎드려요.",
      "머리부터 발끝까지 일직선을 만들어요.",
      "배에 힘을 주어 엉덩이가 처지거나 솟지 않게 해요.",
      "목은 편하게 둬요.",
    ],
    shootMoment: "자세를 잡고 버티는 중간",
    cameraNote: "옆에서 전신이 보이게, 폰을 몸 높이 가까이 두고 2~3m 떨어져서 찍어요.",
    imagePath: "/guide/plank.svg",
    imageAlt: "옆에서 본 플랭크 자세와 바닥 가까이 놓은 카메라 위치를 그린 그림",
  },
  other: {
    id: "other",
    name: "기타",
    steps: [],
    shootMoment: "가장 힘든 순간",
    cameraNote: "옆에서 전신이 보이게 찍어요.",
    imagePath: "/guide/other.svg",
    imageAlt: "옆에서 전신이 보이도록 카메라를 두는 위치를 그린 그림",
  },
};
