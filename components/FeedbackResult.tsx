// Design Ref: §5.3 홈 화면의 결과 영역 — 피드백 결과를 보여 준다. (PLAN 12번)
// 다시 촬영·운동 불일치 확인의 자세한 흐름은 PLAN 13번, 평가는 PLAN 15번에서 이어서 만든다.
// 안내 문구(AI 주의·의료 아님·통증·부상 부위·심한 증상)는 코드가 붙인 notices를 보고 보여 준다.

import type { FeedbackResponse, Verdict } from "@/lib/types";

const VERDICT_LABELS: Record<Verdict, string> = {
  similar: "정석과 거의 같음",
  slight: "정석과 조금 다름",
  large: "정석과 많이 다름",
};

/** 차이 단계별 배지 색 (색만으로 구분하지 않도록 글자도 함께 보여 준다) */
const VERDICT_STYLES: Record<Verdict, string> = {
  similar: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100",
  slight: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  large: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
};

export const AI_CAUTION_TEXT =
  "AI가 분석한 결과라 실제로 올바른 자세와 다르거나 내 몸에 맞지 않을 수 있습니다. 참고용으로만 활용해 주세요.";

/** 정석과 다른 점 등 목록 하나 */
function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function FeedbackResult({ result }: { result: FeedbackResponse }) {
  const { notices } = result;
  const isSevere = result.status === "severe";

  return (
    <section aria-label="피드백 결과" className="flex flex-col gap-4 border-t border-foreground/15 pt-6">
      {/* 심한 증상: 경고 블록만 보여 주고 자세 피드백은 숨긴다. */}
      {isSevere && (
        <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-900 dark:bg-red-950/50 dark:text-red-100">
          <p className="text-base font-bold">지금은 운동을 즉시 중단하고, 병원·119에 상담하세요.</p>
          <p className="mt-1 text-sm">적어 주신 증상은 위험할 수 있어요. 자세 피드백은 보여 드리지 않습니다.</p>
        </div>
      )}

      {result.status === "retake" && (
        <p className="rounded-lg bg-foreground/5 px-3 py-2 text-sm">
          사진으로 자세를 확인하기 어려워요. 안내를 보고 다시 촬영해 주세요.
        </p>
      )}
      {result.status === "mismatch" && (
        <p className="rounded-lg bg-foreground/5 px-3 py-2 text-sm">
          선택한 운동과 사진이 달라 보여요. 운동과 사진을 다시 확인해 주세요.
        </p>
      )}

      {result.status === "ok" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {result.verdict && (
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${VERDICT_STYLES[result.verdict]}`}>
                {VERDICT_LABELS[result.verdict]}
              </span>
            )}
            {result.beta && (
              <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs">베타 · 정확도 미보장</span>
            )}
            {result.uncertain && (
              <span className="rounded-full bg-foreground/10 px-3 py-1 text-xs">확실하지 않음</span>
            )}
          </div>
          {result.assessment && <p className="text-base font-medium">{result.assessment}</p>}
          <Section title="정석과 다른 점" items={result.differences} />
          <Section title="무리가 가는 부분" items={result.problemParts} />
          <Section title="내 몸에 맞는 수정 방법" items={result.fixes} />
        </>
      )}

      {/* 코드가 붙이는 안내: AI 답변과 무관하게 항상 보여 준다. */}
      {notices.pain && !isSevere && (
        <p className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          통증이 있다면 운동을 멈추세요. 계속되면 전문가와 상담하세요.
        </p>
      )}
      {notices.injuryParts && notices.injuryParts.length > 0 && !isSevere && (
        <p className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          {notices.injuryParts.join(", ")} 부위는 특히 조심하세요. 불편하면 바로 멈추세요.
        </p>
      )}
      <p className="text-xs text-foreground/70">{AI_CAUTION_TEXT}</p>
      <p className="text-xs text-foreground/70">참고용 자세 안내이며 의료 진단이 아닙니다.</p>
    </section>
  );
}
