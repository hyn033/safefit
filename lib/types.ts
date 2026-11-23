// Design Ref: §3 — 브라우저 저장값과 브라우저·서버가 주고받는 데이터의 모양을 한곳에 정한다.
// 화면, 브라우저 저장, 서버 API가 모두 이 파일의 모양을 같이 쓴다. (PLAN 2번)

// ─────────────────────────────────────────────
// 선택지 목록 (화면의 선택 칸과 타입이 같은 목록을 쓰도록 한곳에 둔다)
// ─────────────────────────────────────────────

/** 운동 경험: 처음 / 1년 미만 / 1년 이상 */
export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const EXPERIENCE_LEVELS = ["beginner", "under1y", "over1y"] as const;
export type Experience = (typeof EXPERIENCE_LEVELS)[number];

/** 부상 이력·불편한 부위: 무릎, 허리, 어깨, 발목, 손목, 목, 기타 */
export const INJURY_PARTS = [
  "knee",
  "back",
  "shoulder",
  "ankle",
  "wrist",
  "neck",
  "other",
] as const;
export type InjuryPart = (typeof INJURY_PARTS)[number];

/** 운동 목록: 스쿼트, 런지, 플랭크, 기타(목록에 없는 운동) */
export const EXERCISE_IDS = ["squat", "lunge", "plank", "bridge", "other"] as const;
export type ExerciseId = (typeof EXERCISE_IDS)[number];

// ─────────────────────────────────────────────
// 브라우저에만 저장하는 값 (사진·메모·피드백 결과·평가는 저장하지 않는다)
// ─────────────────────────────────────────────

/** 몸 정보 (브라우저에만 저장) */
export interface Profile {
  /** 성별. 운동 안내 그림을 고르고 AI에게 참고로 알린다. (예전에 저장된 몸 정보에는 없을 수 있다) */
  gender?: Gender;
  experience: Experience;
  /** "없음"을 고른 경우 true. 이때 injuries는 빈 배열이어야 한다. */
  noInjury: boolean;
  injuries: InjuryPart[];
  /** injuries에 'other'가 있으면 필수 */
  injuryOther?: string;
  /** 키(cm). 허용 범위는 100~250. 체질량지수로 관절 부담 단계를 정한다. (예전에 저장된 몸 정보에는 없을 수 있다) */
  heightCm?: number;
  /** 체중(kg). 허용 범위는 20~300 (초안) */
  weightKg: number;
}

/** 동의 기록 */
export interface ConsentRecord {
  agreed: true;
  /** 동의한 시각 (ISO 문자열) */
  at: string;
}

/** 하루 사용 횟수 기록 */
export interface UsageRecord {
  /** 기기 현지 날짜 (YYYY-MM-DD). 날짜가 바뀌면 count를 0으로 되돌린다. */
  date: string;
  count: number;
}

// ─────────────────────────────────────────────
// 서버 API: POST /api/feedback
// ─────────────────────────────────────────────

/** 피드백 요청 */
export interface FeedbackRequest {
  exerciseId: ExerciseId;
  /** exerciseId가 'other'일 때 직접 입력한 운동 이름 */
  exerciseOther?: string;
  /** 오늘 메모 (비어도 됨) */
  memo: string;
  profile: Profile;
  /** 줄인 JPEG (data URL) */
  imageDataUrl: string;
  /** 운동·사진 불일치 확인에서 "맞다"고 답한 재요청이면 true */
  exerciseConfirmed?: boolean;
}

/** 응답 상태: 정상 / 다시 촬영 / 운동·사진 불일치 확인 / 심한 증상 */
export type FeedbackStatus = "ok" | "retake" | "mismatch" | "severe";

/** 정석과의 차이 단계: 거의 같음 / 조금 다름 / 많이 다름 */
export type Verdict = "similar" | "slight" | "large";

/**
 * 사진 위에 그려 줄 선 하나. 좌표는 사진 전체를 0~1로 본 비율이다. (왼쪽 위가 0,0)
 * good = 잘 된 기준선(초록), fix = 고치면 좋은 부분(주황)
 */
export interface OverlayLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: "good" | "fix";
  /** 선 옆에 붙일 짧은 설명 (없을 수 있다) */
  label?: string;
}

/** 코드가 항상 붙이는 안내 (AI 답변과 무관하게 표시한다) */
export interface FeedbackNotices {
  /** AI 분석 주의 문구 */
  aiCaution: true;
  /** 의료 진단 아님 */
  notMedical: true;
  /** 통증·불편 표현이 있을 때 */
  pain?: true;
  /** 심한 증상 표현이 있을 때 */
  severe?: true;
  /** 주의가 필요한 부상 부위 */
  injuryParts?: string[];
  /** 관절 부담이 큰 몸 조건에서 굽히는 운동(스쿼트·런지)을 할 때: 깊이를 얕게 시작하라는 안내 */
  jointCare?: true;
}

/** 피드백 결과 */
export interface FeedbackResponse {
  status: FeedbackStatus;
  /** 정석과의 차이 단계 */
  verdict?: Verdict;
  /** 정석과 비교한 한 줄 요약 */
  assessment?: string;
  /** 정석과 다른 점 (항목별 설명) */
  differences?: string[];
  /** 무리 가는 부분 */
  problemParts?: string[];
  /** 내 몸에 맞는 수정 방법 (최대 3개) */
  fixes?: string[];
  /** 메모에 적은 자세 관련 질문에 대한 AI의 답 (질문이 없으면 없음) */
  memoAnswer?: string;
  /** 사진 위에 그려 줄 선 (최대 4개, AI가 대략 짚은 위치라 정확하지 않을 수 있다) */
  overlay?: OverlayLine[];
  /** "확실하지 않다" 표시 */
  uncertain?: boolean;
  notices: FeedbackNotices;
  /** 목록에 없는 '기타' 운동(안내 카드 없음)이면 true */
  beta: boolean;
}

/** 서버 오류 코드 (HTTP 상태 코드와 함께 쓴다) */
export const API_ERROR_CODES = {
  /** 400: 필수 항목 누락, 형식·값 범위 위반 */
  INVALID_INPUT: 400,
  /** 413: 요청 본문이 3MB 초과 */
  IMAGE_TOO_LARGE: 413,
  /** 502: AI 호출 실패, 답변 모양 오류, 문제 표현을 지운 뒤 내용 부족 */
  AI_FAILED: 502,
  /** 504: 서버 전체 마감(28초) 초과 */
  AI_TIMEOUT: 504,
  /** 500: 그 밖의 오류 */
  SERVER_ERROR: 500,
} as const;
export type ApiErrorCode = keyof typeof API_ERROR_CODES;

/** 오류 응답 모양 */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    /** 사용자에게 보여 줄 안내 문구 */
    message: string;
  };
}
