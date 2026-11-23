// Design Ref: §4.6 — 운동 안내 데이터. AI가 매번 만들지 않고 미리 정해 둔 고정 내용을 쓴다.
// 주의: 문구와 카메라 수치는 초안이며 전문가 확인이 필요하다. (PLAN 7번)
// 예시 이미지는 옆모습 자세 사진이며 남성(public/guide/male/)·여성(public/guide/female/) 두 벌이다. 몸 정보의 성별에 맞는 쪽을 보여 준다.
// '기타'는 일반 가이드 그림(other.svg)을 쓴다. 카메라 위치는 cameraNote 글로 안내한다. 바꿀 때는 imagePath만 고치면 된다.

import type { ExerciseId, Gender } from "./types";

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
  /** 여성용 예시 이미지 경로. 없으면 imagePath를 그대로 쓴다. */
  imagePathFemale?: string;
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
    cameraNote: "옆에서 전신이 보이게 2~3m 떨어져서 찍어요.",
    imagePath: "/guide/male/squat.jpg",
    imagePathFemale: "/guide/female/squat.jpg",
    imageAlt: "옆에서 본 가장 깊이 앉은 스쿼트 자세 사진",
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
    cameraNote: "옆에서 전신이 보이게 2~3m 떨어져서 찍어요.",
    imagePath: "/guide/male/lunge.jpg",
    imagePathFemale: "/guide/female/lunge.jpg",
    imageAlt: "옆에서 본 앞무릎을 굽힌 런지 자세 사진",
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
    imagePath: "/guide/male/plank.jpg",
    imagePathFemale: "/guide/female/plank.jpg",
    imageAlt: "옆에서 본 플랭크 자세 사진",
  },
  bridge: {
    id: "bridge",
    name: "브릿지",
    steps: [
      "누워서 무릎을 세우고 발을 엉덩이 쪽으로 당겨요.",
      "발로 바닥을 밀며 엉덩이를 들어요.",
      "어깨부터 무릎까지 일직선이 되게 해요.",
      "허리가 과하게 꺾이지 않게 해요.",
    ],
    shootMoment: "엉덩이를 가장 높이 든 순간",
    cameraNote: "옆에서 전신이 보이게, 폰을 바닥 가까이 두고 2~3m 떨어져서 찍어요.",
    imagePath: "/guide/male/bridge.jpg",
    imagePathFemale: "/guide/female/bridge.jpg",
    imageAlt: "옆에서 본 브릿지 자세 사진",
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

/** 입력한 이름으로 부르는 말 (띄어쓰기·대소문자 무시, 끝의 "운동"·"자세"는 뗀다) */
const EXERCISE_ALIASES: Record<Exclude<ExerciseId, "other">, string[]> = {
  squat: ["스쿼트", "스쿼츠", "squat"],
  lunge: ["런지", "런쥐", "lunge"],
  plank: ["플랭크", "플랭", "plank"],
  bridge: ["브릿지", "브리지", "힙브릿지", "글루트브릿지", "bridge"],
};

/**
 * 사용자가 입력한 운동 이름이 안내 카드가 있는 운동이면 그 id를, 아니면 'other'(기타, 베타)를 돌려준다.
 * 예) "스쿼트", "Squat 운동" → squat / "데드리프트" → other
 */
export function matchExercise(input: string): ExerciseId {
  const key = input.replace(/\s+/g, "").toLowerCase().replace(/(운동|자세)$/, "");
  for (const [id, aliases] of Object.entries(EXERCISE_ALIASES)) {
    if (aliases.includes(key)) return id as ExerciseId;
  }
  return "other";
}

/** 홈 화면 슬라이드에 보여 주는 운동 순서 ('기타'는 슬라이드가 아니라 직접 입력으로 고른다) */
export const SLIDE_EXERCISE_IDS = ["squat", "lunge", "plank", "bridge"] as const;

/** 성별에 맞는 예시 이미지 경로 (성별을 모르거나 여성용이 없으면 기본 이미지) */
export function getGuideImage(guide: ExerciseGuide, gender?: Gender): string {
  return gender === "female" && guide.imagePathFemale ? guide.imagePathFemale : guide.imagePath;
}
