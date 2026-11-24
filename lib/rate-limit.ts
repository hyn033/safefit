// 서버 쪽 사용 횟수 제한. 브라우저의 하루 10회 제한은 저장소를 지우면 풀리므로, API를 직접 반복 호출해 AI 비용을 쓰는 것을 서버에서도 막는다.
// 서버 메모리에 세므로 같은 서버 인스턴스 안에서만 정확하다. (Vercel은 인스턴스가 여러 개일 수 있어 완전하지 않다)
// 확실한 상한은 Vercel Firewall의 Rate Limit 규칙과 OpenAI 월 예산 한도로 함께 건다. 서버 코드에서만 쓴다.
// 주소(IP)는 제한 계산에만 쓰고 저장·기록하지 않는다. 사진·메모·몸 정보는 여기서 다루지 않는다.

/** 같은 주소가 1분에 보낼 수 있는 횟수 */
const PER_MINUTE = 5;
/** 같은 주소가 하루에 보낼 수 있는 횟수 (브라우저 제한 10회보다 조금 넉넉하게) */
const PER_DAY = 20;
/** 서버 한 인스턴스가 하루에 받을 수 있는 전체 횟수 (비용 상한) */
const GLOBAL_PER_DAY = 1500;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;
/** 기억하는 주소가 이 수를 넘으면 오래된 것부터 정리한다. (메모리 폭증 방지) */
const MAX_TRACKED = 5000;

const hits = new Map<string, number[]>();
let globalHits: number[] = [];

/** 요청 헤더에서 보낸 쪽 주소를 구한다. (Vercel이 x-forwarded-for를 채운다. 없으면 한 묶음으로 센다) */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

/** 이번 요청을 세고, 제한을 넘었으면 false를 돌려준다. */
export function allowRequest(key: string, now: number = Date.now()): boolean {
  globalHits = globalHits.filter((time) => now - time < DAY_MS);
  if (globalHits.length >= GLOBAL_PER_DAY) return false;

  const recent = (hits.get(key) ?? []).filter((time) => now - time < DAY_MS);
  const lastMinute = recent.filter((time) => now - time < MINUTE_MS);
  if (recent.length >= PER_DAY || lastMinute.length >= PER_MINUTE) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  globalHits.push(now);

  if (hits.size > MAX_TRACKED) {
    for (const [name, times] of hits) {
      if (times.every((time) => now - time >= DAY_MS)) hits.delete(name);
      if (hits.size <= MAX_TRACKED) break;
    }
    // 그래도 많으면 가장 오래 전에 들어온 것부터 지운다.
    for (const name of hits.keys()) {
      if (hits.size <= MAX_TRACKED) break;
      hits.delete(name);
    }
  }
  return true;
}
