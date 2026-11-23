// Design Ref: §3 — 동의·몸 정보·하루 사용 횟수를 휴대폰 브라우저(localStorage)에만 저장한다. (PLAN 3번)
// 사진·메모·피드백 결과·평가는 저장하지 않는다. 서버로도 보내지 않는다.
//
// 브라우저 저장소는 시크릿 모드나 저장 차단 설정에서 오류가 날 수 있다.
// 그래서 모든 읽기·쓰기를 try/catch로 감싸고, 실패하면 "값 없음"으로 취급한다.

import { EXPERIENCE_LEVELS, GENDERS, INJURY_PARTS } from "./types";
import type { ConsentRecord, Profile, UsageRecord } from "./types";
import { INJURY_OTHER_MAX_LENGTH } from "./validate";

/** 한 기기(브라우저)에서 하루에 요청할 수 있는 피드백 횟수 */
export const DAILY_LIMIT = 10;

/** 저장 키 (Design Ref: §3) */
const KEYS = {
  consent: "safefit.consent",
  profile: "safefit.profile",
  usage: "safefit.usage",
} as const;

// ─────────────────────────────────────────────
// 바탕 함수: 저장소 접근과 JSON 읽기·쓰기
// ─────────────────────────────────────────────

/** 브라우저 저장소를 돌려준다. 서버 실행 중이거나 접근이 막혀 있으면 null */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 저장된 값을 읽어 JSON으로 바꾼다. 없거나 깨져 있으면 null */
function readJson(key: string): unknown {
  try {
    const raw = getStorage()?.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** 값을 JSON으로 저장한다. 성공하면 true */
function writeJson(key: string, value: unknown): boolean {
  try {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─────────────────────────────────────────────
// 동의 기록
// ─────────────────────────────────────────────

function isConsentRecord(value: unknown): value is ConsentRecord {
  return isRecord(value) && value.agreed === true && typeof value.at === "string";
}

/** 저장된 동의 기록. 없거나 모양이 맞지 않으면 null */
export function getConsent(): ConsentRecord | null {
  const value = readJson(KEYS.consent);
  return isConsentRecord(value) ? value : null;
}

/** 동의했는지 여부 */
export function hasConsent(): boolean {
  return getConsent() !== null;
}

/** 동의를 저장한다. 성공하면 true */
export function saveConsent(now: Date = new Date()): boolean {
  const record: ConsentRecord = { agreed: true, at: now.toISOString() };
  return writeJson(KEYS.consent, record);
}

// ─────────────────────────────────────────────
// 몸 정보
// ─────────────────────────────────────────────

// 읽을 때는 "모양이 맞는지"만 확인한다. 값의 범위(체중 20~300 등)와 입력 규칙은
// 입력 검사(PLAN 9번, lib/validate.ts)에서 확인한다.
function isProfile(value: unknown): value is Profile {
  if (!isRecord(value)) return false;
  if (!(EXPERIENCE_LEVELS as readonly unknown[]).includes(value.experience)) return false;
  if (value.gender !== undefined && !(GENDERS as readonly unknown[]).includes(value.gender)) return false;
  if (typeof value.noInjury !== "boolean") return false;
  if (
    !Array.isArray(value.injuries) ||
    !value.injuries.every((part) => (INJURY_PARTS as readonly unknown[]).includes(part))
  ) {
    return false;
  }
  if (value.injuryOther !== undefined && typeof value.injuryOther !== "string") return false;
  // 예전에 너무 길게 저장된 값은 서버가 거절하므로, 몸 정보가 없는 것으로 보고 다시 입력받는다.
  if (typeof value.injuryOther === "string" && value.injuryOther.trim().length > INJURY_OTHER_MAX_LENGTH) return false;
  if (value.heightCm !== undefined && !(typeof value.heightCm === "number" && Number.isFinite(value.heightCm))) return false;
  return typeof value.weightKg === "number" && Number.isFinite(value.weightKg);
}

/** 저장된 몸 정보. 없거나 모양이 맞지 않으면 null */
export function getProfile(): Profile | null {
  const value = readJson(KEYS.profile);
  return isProfile(value) ? value : null;
}

/** 몸 정보가 저장돼 있는지 여부 */
export function hasProfile(): boolean {
  return getProfile() !== null;
}

/** 몸 정보를 저장한다. 이미 있으면 덮어쓴다(수정). 성공하면 true */
export function saveProfile(profile: Profile): boolean {
  return writeJson(KEYS.profile, profile);
}

// ─────────────────────────────────────────────
// 하루 사용 횟수
// ─────────────────────────────────────────────

function isUsageRecord(value: unknown): value is UsageRecord {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count >= 0
  );
}

/** 기기 현지 날짜를 YYYY-MM-DD로 돌려준다. (Design Ref: §6.2 — 날짜는 기기의 현지 날짜 기준) */
export function getLocalDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 오늘의 사용 횟수. 기록이 없거나 날짜가 바뀌었으면 0회로 본다(저장은 하지 않음). */
export function getUsage(now: Date = new Date()): UsageRecord {
  const today = getLocalDateString(now);
  const value = readJson(KEYS.usage);
  if (isUsageRecord(value) && value.date === today) return value;
  return { date: today, count: 0 };
}

/** 사용 횟수를 1 늘려 저장하고, 늘어난 기록을 돌려준다. (센 시점은 홈 화면이 정한다: 요청을 보내는 순간 1회) */
export function incrementUsage(now: Date = new Date()): UsageRecord {
  const current = getUsage(now);
  const next: UsageRecord = { date: current.date, count: current.count + 1 };
  writeJson(KEYS.usage, next);
  return next;
}
