"use client";

// Design Ref: §5.3 홈 화면의 결과 영역 — 피드백 결과를 보여 준다. (PLAN 12번)
// 다시 촬영·운동 불일치 확인은 PLAN 13번, "도움이 됐나요?" 평가는 PLAN 15번에서 만들었다.
// 안내 문구(AI 주의·의료 아님·통증·부상 부위·심한 증상)는 코드가 붙인 notices를 보고 보여 준다.

import { useState, type SyntheticEvent } from "react";
import { analyzePose, type PartPaths } from "@/lib/pose";
import { getGuideImage, type ExerciseGuide } from "@/lib/exercises";
import type { FeedbackResponse, Gender, OverlayItem, Verdict } from "@/lib/types";

const VERDICT_LABELS: Record<Verdict, string> = {
  similar: "옳은 자세입니다",
  slight: "조금 옳지 않은 자세입니다",
  large: "옳지 않은 자세입니다",
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
function Section({ title, items, numbered = false }: { title: string; items?: string[]; numbered?: boolean }) {
  if (!items || items.length === 0) return null;
  // 수정 방법은 가장 중요하므로 번호를 붙인 카드로 눈에 띄게, 나머지는 가볍게 보여 준다.
  return (
    <section className={`flex flex-col gap-2 ${numbered ? "rounded-2xl bg-foreground/[0.06] p-4" : ""}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {numbered ? (
        <ol className="space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {index + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/85">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * 내가 올린 사진에서 딴 몸 선을 그 사진 위에 그린다. (사진은 이 화면 안에서만 쓰고 저장하지 않는다)
 * 정석 예시 사진에서도 같은 몸 선을 따서 내 선과 부위별로 비교하고(lib/pose.ts), 정석과 같은 부위는 초록, 다른 부위는 빨강으로 칠한다.
 */
function PhotoOverlay({ photoUrl, items }: { photoUrl: string; items: OverlayItem[] }) {
  // 내 몸 선: undefined = 찾는 중, null = 찾지 못함
  const [paths, setPaths] = useState<PartPaths | null | undefined>(undefined);

  async function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (items.length === 0) {
      setPaths(null);
      return;
    }
    try {
      setPaths((await analyzePose(event.currentTarget))?.paths ?? null);
    } catch {
      setPaths(null);
    }
  }

  const segments = items.flatMap((item) => {
    const points = paths?.[item.part];
    if (!points) return [];
    return points.slice(1).map((end, index) => ({ from: points[index], to: end, kind: item.kind }));
  });
  const hasItems = items.length > 0;

  return (
    <figure className="flex flex-col gap-2">
      {/* 칸이 사진 크기에 딱 맞아야 선이 몸 위에 놓인다. (세로 사진도 줄여 맞춘다) */}
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-2xl bg-foreground/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- 내가 올린 사진의 임시 주소라 최적화 대상이 아니다 */}
        <img
          src={photoUrl}
          alt="내가 올린 자세 사진에 옳은 자세와 비교한 선을 그어 표시한 그림"
          onLoad={handleLoad}
          className="block h-auto max-h-[42dvh] w-auto max-w-xs"
        />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
          {segments.map((segment, index) => (
            <line
              key={index}
              x1={segment.from[0]}
              y1={segment.from[1]}
              x2={segment.to[0]}
              y2={segment.to[1]}
              stroke={segment.kind === "good" ? "#22c55e" : "#ef4444"}
              strokeWidth={5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <figcaption className="text-center text-xs text-foreground/70">
        {!hasItems ? (
          "내가 올린 사진이에요."
        ) : paths === undefined ? (
          "몸 위치를 찾는 중이에요…"
        ) : segments.length > 0 ? (
          <>
            <span className="font-semibold text-green-700 dark:text-green-400">초록</span>은 옳은 자세와 같은 곳,{" "}
            <span className="font-semibold text-red-700 dark:text-red-400">빨강</span>은 옳은 자세와 다른 곳이에요.
          </>
        ) : (
          "사진에서 몸 위치를 찾지 못해 선은 표시하지 못했어요."
        )}
      </figcaption>
    </figure>
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

const RATING_LABELS = ["전혀 도움이 안 됐어요", "별로 도움이 안 됐어요", "보통이에요", "도움이 됐어요", "매우 도움이 됐어요"];

/**
 * "도움이 됐나요?" 5점 평가. 평가는 이 화면에서만 받고 저장하거나 보내지 않는다. (Design Ref: §3)
 * 새 결과가 나오면 결과 영역이 다시 만들어지므로 선택도 처음 상태로 돌아간다.
 */
function RatingPrompt() {
  const [rating, setRating] = useState(0);
  return (
    <div className="flex flex-col gap-2">
      <p id="rating-label" className="text-sm font-medium">도움이 됐나요?</p>
      <div role="radiogroup" aria-labelledby="rating-label" className="flex gap-1">
        {RATING_LABELS.map((label, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value}점 ${label}`}
              onClick={() => setRating(value)}
              className={`min-h-11 min-w-11 rounded-lg text-2xl ${value <= rating ? "text-amber-500" : "text-foreground/30"}`}
            >
              <span aria-hidden="true">{value <= rating ? "★" : "☆"}</span>
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <p role="status" className="text-sm text-foreground/70">
          {rating}점을 선택했어요. 고마워요! (평가는 저장되지 않아요.)
        </p>
      )}
    </div>
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
  /** 사용자가 올린 사진의 임시 주소 (선을 겹쳐 그리는 데 쓴다) */
  photoUrl?: string | null;
  /** 몸 정보의 성별 (다시 촬영 안내의 예시 그림을 성별에 맞게 고른다) */
  gender?: Gender;
}

export default function FeedbackResult({ result, guide, onConfirmExercise, onReselect, busy, photoUrl, gender }: FeedbackResultProps) {
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
          <img src={getGuideImage(guide, gender)} alt={guide.imageAlt} className="w-full rounded-lg" />
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
              className="sf-btn"
            >
              {busy ? "분석 중…" : "예, 이대로 분석"}
            </button>
            <button
              type="button"
              onClick={onReselect}
              disabled={busy}
              className="sf-btn-secondary"
            >
              아니요, 운동 다시 고를게요
            </button>
          </div>
        </div>
      )}

      {result.status === "ok" && (
        <>
          {/* 사진은 선이 없어도 항상 보여 준다. */}
          {photoUrl && <PhotoOverlay photoUrl={photoUrl} items={result.overlay ?? []} />}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {result.verdict && (
                <span className={`rounded-full px-4 py-1.5 text-base font-bold ${VERDICT_STYLES[result.verdict]}`}>
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
          </div>
          <Section title="내 몸에 맞는 수정 방법" items={result.fixes} numbered />
          {result.memoAnswer && (
            <section className="flex flex-col gap-2 rounded-2xl bg-accent/10 p-4">
              <h3 className="text-sm font-semibold">궁금한 점에 대한 답</h3>
              <p className="text-sm leading-relaxed">{result.memoAnswer}</p>
            </section>
          )}
          <Section title="옳은 자세와 다른 점" items={result.differences} />
          <Section title="무리가 가는 부분" items={result.problemParts} />
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
      {notices.jointCare && !isSevere && (
        <p className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          관절에 부담이 갈 수 있는 동작이에요. 깊이를 얕게 시작해서 천천히 늘려 보세요.
        </p>
      )}
      <div className="flex flex-col gap-1 border-t border-foreground/10 pt-3">
        <p className="text-xs leading-relaxed text-foreground/70">{AI_CAUTION_TEXT}</p>
        <p className="text-xs text-foreground/70">참고용 자세 안내이며 의료 진단이 아닙니다.</p>
      </div>
      {result.status === "ok" && <RatingPrompt />}
    </section>
  );
}
