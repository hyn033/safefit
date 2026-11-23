"use client";

// Design Ref: §5.3 홈 화면 — 운동 선택, 운동 안내 카드, 사진, 오늘 메모를 입력받는다. (PLAN 8번)
// 입력 검사(PLAN 9)와 서버 호출·결과 영역(PLAN 12)을 연결했다. 예외 상황(13), 하루 횟수 제한(14), 평가(15)는 이후 작업이다.
// 사진·메모는 이 화면의 메모리에만 두고 어디에도 저장하지 않는다.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { COMMON_GUIDE_NOTES, EXERCISE_GUIDES } from "@/lib/exercises";
import FeedbackResult, { PainNotice } from "@/components/FeedbackResult";
import { toSevereResponse } from "@/lib/feedback";
import { detectPain, detectSevere } from "@/lib/safety";
import { DAILY_LIMIT, getProfile, getUsage } from "@/lib/storage";
import { EXERCISE_IDS } from "@/lib/types";
import type { ApiErrorResponse, ExerciseId, FeedbackRequest, FeedbackResponse } from "@/lib/types";
import { ImagePrepareError, prepareImage } from "@/lib/image";
import { MEMO_MAX_LENGTH, validateFeedbackForm } from "@/lib/validate";
import type { FeedbackFieldErrors } from "@/lib/validate";

const subscribeNothing = () => () => {};

export default function Home() {
  // 하루 사용 횟수는 브라우저에서만 읽을 수 있다. 서버에서 그린 화면과 달라서 생기는 오류를 막으려고 숨겨 둔 상태로 시작한다.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const [exerciseId, setExerciseId] = useState<ExerciseId>("squat");
  const [exerciseOther, setExerciseOther] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<FeedbackFieldErrors>({});
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<FeedbackResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  // 마지막으로 보낸 요청이 "운동 확인" 재요청이었는지 (다시 시도할 때 그대로 따른다)
  const lastConfirmedRef = useRef(false);

  // 미리보기 주소는 사진을 고를 때 만들고, 바꾸거나 화면을 떠날 때 해제한다.
  const previewRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const guide = EXERCISE_GUIDES[exerciseId];
  const remaining = isClient ? Math.max(0, DAILY_LIMIT - getUsage().count) : DAILY_LIMIT;

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    previewRef.current = url;
    setPhoto(file);
    setPreviewUrl(url);
    clearResult();
  }

  /** 입력이 바뀌면 이전 검사 결과를 지운다. */
  function clearResult() {
    setErrors({});
    setResult(null);
    setRequestError(null);
  }

  // 입력 검사 → (심한 증상이면 보내지 않고 안내) → 사진 줄이기 → 서버에 요청 → 결과 표시
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendFeedback(false);
  }

  /** "아니요, 운동 다시 고를게요": 사진·메모는 그대로 두고 운동 선택 칸으로 이동한다. */
  function handleReselect() {
    setResult(null);
    const select = document.getElementById("exercise");
    select?.scrollIntoView({ block: "center" });
    select?.focus();
  }

  /** @param exerciseConfirmed 운동·사진 불일치 확인에서 "맞다"고 답한 재요청이면 true */
  async function sendFeedback(exerciseConfirmed: boolean) {
    if (checking) return;
    lastConfirmedRef.current = exerciseConfirmed;
    const found = validateFeedbackForm({
      exerciseId,
      exerciseOther,
      photo: photo ? { type: photo.type, size: photo.size } : null,
      memo,
    });
    setResult(null);
    setRequestError(null);
    if (Object.keys(found).length > 0 || !photo) {
      setErrors(found);
      return;
    }
    setErrors({});

    const profile = getProfile();
    if (!profile) {
      setRequestError("저장된 몸 정보가 없어요. '몸 정보 수정'에서 먼저 입력해 주세요.");
      return;
    }
    const base = {
      exerciseId,
      exerciseOther: exerciseId === "other" ? exerciseOther.trim() : undefined,
      memo,
      profile,
      ...(exerciseConfirmed ? { exerciseConfirmed: true } : {}),
    };

    // 심한 증상 표현이 있으면 요청을 보내지 않고 안내만 보여 준다. (Design Ref: §2 ②)
    if (detectSevere(memo)) {
      setResult(toSevereResponse({ ...base, imageDataUrl: "" }));
      return;
    }

    setChecking(true);
    try {
      const request: FeedbackRequest = { ...base, imageDataUrl: await prepareImage(photo) };
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        setRequestError(body?.error?.message ?? "잠시 문제가 생겼어요. 다시 시도해 주세요.");
        return;
      }
      const feedback = (await response.json()) as FeedbackResponse;
      // 다시 촬영이면 운동 안내 카드를 다시 펼쳐 보여 준다.
      if (feedback.status === "retake") setGuideOpen(true);
      setResult(feedback);
    } catch (error) {
      if (error instanceof ImagePrepareError) setErrors({ photo: error.message });
      else if (error instanceof DOMException && error.name === "TimeoutError") {
        setRequestError("시간이 오래 걸리고 있어요. 다시 시도해 주세요.");
      } else setRequestError("연결에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6" hidden={!isClient}>
      <p className="text-sm text-foreground/70">
        오늘 남은 횟수 <strong className="text-foreground">{remaining}/{DAILY_LIMIT}</strong>
      </p>

      {/* 운동 선택 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="exercise" className="text-sm font-medium">운동 선택</label>
        <select
          id="exercise"
          value={exerciseId}
          onChange={(event) => {
            setExerciseId(event.target.value as ExerciseId);
            clearResult();
          }}
          className="min-h-11 rounded-lg border border-foreground/15 bg-background px-3 text-base"
        >
          {EXERCISE_IDS.map((id) => (
            <option key={id} value={id}>{EXERCISE_GUIDES[id].name}</option>
          ))}
        </select>
        {exerciseId === "other" && (
          <input
            type="text"
            value={exerciseOther}
            onChange={(event) => {
              setExerciseOther(event.target.value);
              clearResult();
            }}
            maxLength={50}
            placeholder="운동 이름 (예: 데드리프트)"
            aria-label="운동 이름"
            aria-invalid={errors.exerciseOther ? true : undefined}
            className="min-h-11 rounded-lg border border-foreground/15 bg-background px-3 text-base"
          />
        )}
        <FieldError message={errors.exerciseOther} />
      </div>

      {/* 운동 안내 카드 (접고 펼 수 있음) */}
      <section className="rounded-xl border border-foreground/15">
        <button
          type="button"
          onClick={() => setGuideOpen((open) => !open)}
          aria-expanded={guideOpen}
          aria-controls="guide-body"
          className="flex min-h-11 w-full items-center justify-between px-4 text-left text-sm font-medium"
        >
          <span>운동 안내 · {guide.name}</span>
          <span aria-hidden="true">{guideOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {guideOpen && (
          <div id="guide-body" className="flex flex-col gap-3 px-4 pb-4 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 그림이라 최적화가 필요 없다 */}
            <img src={guide.imagePath} alt={guide.imageAlt} className="w-full rounded-lg" />
            {guide.steps.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
            <p><strong>찍을 순간</strong>: {guide.shootMoment}</p>
            <p><strong>카메라</strong>: {guide.cameraNote}</p>
            <ul className="list-disc space-y-1 pl-5 text-foreground/70">
              {COMMON_GUIDE_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 사진 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="photo" className="text-sm font-medium">사진 (촬영하거나 앨범에서 선택)</label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhoto}
          className="min-h-11 text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-foreground file:px-4 file:text-background"
        />
        {photo && previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 사용자가 고른 사진의 임시 미리보기라 최적화 대상이 아니다
          <img src={previewUrl} alt="선택한 자세 사진 미리보기" className="max-h-80 w-full rounded-lg object-contain" />
        )}
        <FieldError message={errors.photo} />
        <p className="text-xs text-foreground/70">
          전신이 나오게, 밝은 곳에서, 옆모습으로 찍어 주세요. 얼굴은 가려 주세요.
        </p>
      </div>

      {/* 오늘 메모 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="memo" className="text-sm font-medium">오늘 메모 (비워도 돼요)</label>
        <textarea
          id="memo"
          value={memo}
          onChange={(event) => {
            setMemo(event.target.value);
            clearResult();
          }}
          maxLength={MEMO_MAX_LENGTH}
          rows={3}
          placeholder="예: 무릎이 아파요"
          className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-base"
        />
        <p className="text-right text-xs text-foreground/60">{memo.length}/{MEMO_MAX_LENGTH}</p>
        <FieldError message={errors.memo} />
      </div>

      <button
        type="submit"
        disabled={checking}
        className="min-h-12 rounded-lg bg-foreground px-4 text-base font-medium text-background disabled:opacity-40"
      >
        {checking ? "분석 중… (최대 30초)" : "피드백 받기"}
      </button>
      {requestError && (
        <div className="-mt-2 flex flex-col gap-3">
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {requestError}
          </p>
          {/* 서버 응답이 없어도 통증 안내는 사라지지 않는다. (메모는 브라우저가 직접 감지한다.) */}
          {detectPain(memo) && <PainNotice />}
          <button
            type="button"
            onClick={() => void sendFeedback(lastConfirmedRef.current)}
            disabled={checking}
            className="min-h-11 rounded-lg border border-foreground px-4 text-sm font-medium disabled:opacity-40"
          >
            다시 시도
          </button>
        </div>
      )}
      {result && (
        <FeedbackResult
          result={result}
          guide={guide}
          onConfirmExercise={() => void sendFeedback(true)}
          onReselect={handleReselect}
          busy={checking}
        />
      )}
    </form>
  );
}

/** 입력칸 아래에 보여 주는 오류 문구 */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}
