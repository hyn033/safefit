// Design Ref: §5.3 홈 화면의 결과 영역 — 피드백 결과를 보여 준다. (PLAN 12번)
// 다시 촬영·운동 불일치 확인의 자세한 흐름은 PLAN 13번, 평가는 PLAN 15번에서 이어서 만든다.
// 안내 문구(AI 주의·의료 아님·통증·부상 부위·심한 증상)는 코드가 붙인 notices를 보고 보여 준다.

import type { ExerciseGuide } from "@/lib/exercises";
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

/** 통증 안내. 오류 화면에서도 같은 문구를 쓴다. */
export function PainNotice() {
  return (
    <p className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      통증이 있다면 운동을 멈추세요. 계속되면 전문가와 상담하세요.
    </p>
  );
}

interface FeedbackResultProps {
  result: FeedbackResponse;
  /** 지금 고른 운동의 안내 (다시 촬영 안내에 다시 보여 준다) */
  guide: ExerciseGuide;
  /** 운동·사진 불일치에서 "예, 이대로 분석" */
  onConfirmExercise: () => void;
  /** 운동·사진 불일치에서 "아니요, 운동 다시 고를게요" */
  onReselect: () => void;
  busy: boolean;
}

export default function FeedbackResult({ result, guide, onConfirmExercise, onReselect, busy }: FeedbackResultProps) {
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

      {/* 다시 촬영: 분석하지 않고 안내 카드를 다시 보여 준다. */}
      {result.status === "retake" && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-base font-semibold">다시 촬영해 주세요.</p>
          <p className="text-sm">사진으로 자세를 확인하기 어려워요. 아래 안내대로 다시 찍어 주세요.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 그림이라 최적화가 필요 없다 */}
          <img src={guide.imagePath} alt={guide.imageAlt} className="w-full rounded-lg" />
          <p className="text-sm"><strong>찍을 순간</strong>: {guide.shootMoment}</p>
          <p className="text-sm"><strong>카메라</strong>: {guide.cameraNote}</p>
          <p className="text-xs text-foreground/70">전신이 나오게, 밝은 곳에서, 옆모습으로 찍어 주세요. 얼굴은 가려 주세요.</p>
        </div>
      )}

      {/* 운동·사진 불일치: 사용자가 맞는지 확인한다. */}
      {result.status === "mismatch" && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-base font-semibold">선택한 운동과 사진이 달라 보입니다. 맞나요?</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onConfirmExercise}
              disabled={busy}
              className="min-h-11 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40"
            >
              {busy ? "분석 중…" : "예, 이대로 분석"}
            </button>
            <button
              type="button"
              onClick={onReselect}
              disabled={busy}
              className="min-h-11 rounded-lg border border-foreground px-4 text-sm font-medium disabled:opacity-40"
            >
              아니요, 운동 다시 고를게요
            </button>
          </div>
        </div>
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
        <PainNotice />
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
