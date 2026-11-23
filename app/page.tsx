"use client";

// Design Ref: §5.3 홈 화면 — 운동 이름을 입력해 확인하면 안내 그림이 나오고, 이어서 사진·메모를 입력받는다. (PLAN 8번, 화면 단순화)
// 입력 화면은 세로 스크롤이 없게 한 화면에 담고, 결과는 입력 화면을 대신하는 별도 화면으로 보여 준다.
// 입력 검사(PLAN 9)와 서버 호출·결과 영역(PLAN 12)을 연결했다. 예외 상황(13), 하루 횟수 제한(14), 평가(15)는 이후 작업이다.
// 사진·메모는 이 화면의 메모리에만 두고 어디에도 저장하지 않는다.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { COMMON_GUIDE_NOTES, EXERCISE_GUIDES, SLIDE_EXERCISE_IDS, matchExercise } from "@/lib/exercises";
import FeedbackResult, { PainNotice } from "@/components/FeedbackResult";
import { BulbIcon, CameraIcon, ChatIcon, ChevronRightIcon, DumbbellIcon, SendIcon } from "@/components/Icons";
import { toSevereResponse } from "@/lib/feedback";
import { detectPain, detectSevere } from "@/lib/safety";
import { DAILY_LIMIT, getProfile, getUsage, incrementUsage } from "@/lib/storage";
import type { ApiErrorResponse, ExerciseId, FeedbackRequest, FeedbackResponse } from "@/lib/types";
import { ImagePrepareError, prepareImage } from "@/lib/image";
import { EXERCISE_OTHER_MAX_LENGTH, MEMO_MAX_LENGTH, validateFeedbackForm } from "@/lib/validate";
import type { FeedbackFieldErrors } from "@/lib/validate";

const subscribeNothing = () => () => {};

export default function Home() {
  // 하루 사용 횟수는 브라우저에서만 읽을 수 있다. 서버에서 그린 화면과 달라서 생기는 오류를 막으려고 숨겨 둔 상태로 시작한다.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);

  // 입력창의 글자와, "확인"을 눌러 정해진 운동을 따로 둔다. 확인 전에는 안내 그림을 보여 주지 않는다.
  const [exerciseText, setExerciseText] = useState("");
  const [confirmed, setConfirmed] = useState(true);
  const [exerciseId, setExerciseId] = useState<ExerciseId>("squat");
  const [exerciseOther, setExerciseOther] = useState("");
  const [stepsOpen, setStepsOpen] = useState(false);
  // 운동 고르기 슬라이드: 지금 보이는 칸 번호와 직접 입력 칸을 열었는지
  const [slideIndex, setSlideIndex] = useState(0);
  const [showOther, setShowOther] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [errors, setErrors] = useState<FeedbackFieldErrors>({});
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<FeedbackResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  // 마지막으로 보낸 요청이 "운동 확인" 재요청이었는지 (다시 시도할 때 그대로 따른다)
  const lastConfirmedRef = useRef(false);
  // 오늘 사용 횟수가 바뀌면 남은 횟수 표시를 다시 그리기 위한 값
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  // 미리보기 주소는 사진을 고를 때 만들고, 바꾸거나 화면을 떠날 때 해제한다.
  const previewRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const guide = EXERCISE_GUIDES[exerciseId];
  const remaining = isClient ? Math.max(0, DAILY_LIMIT - (usageCount ?? getUsage().count)) : DAILY_LIMIT;

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
    setLimitReached(false);
  }

  // 입력 검사 → (심한 증상이면 보내지 않고 안내) → 사진 줄이기 → 서버에 요청 → 결과 표시
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) confirmExercise();
    else void sendFeedback(false);
  }

  /** 슬라이드에서 운동을 눌러 정한다. */
  function selectExercise(id: ExerciseId) {
    setExerciseId(id);
    setExerciseOther("");
    setConfirmed(true);
    clearResult();
  }

  /** 슬라이드를 옆으로 밀면 지금 보이는 칸 번호(점 표시)를 갱신한다. */
  function handleSlideScroll() {
    const box = slideRef.current;
    if (!box || box.children.length === 0) return;
    const card = box.children[0] as HTMLElement;
    const step = card.offsetWidth;
    setSlideIndex(Math.min(SLIDE_EXERCISE_IDS.length - 1, Math.max(0, Math.round(box.scrollLeft / step))));
  }

  /** 좌우 버튼으로 한 칸씩 넘긴다. */
  function moveSlide(direction: 1 | -1) {
    const box = slideRef.current;
    if (!box) return;
    const card = box.children[0] as HTMLElement;
    box.scrollBy({ left: direction * card.offsetWidth, behavior: "smooth" });
  }

  /** 입력한 운동 이름을 확인한다. 목록에 있으면 그 운동, 없으면 '기타'(베타)로 본다. */
  function confirmExercise() {
    const name = exerciseText.trim();
    if (name === "") {
      setErrors({ exerciseOther: "운동 이름을 입력해 주세요." });
      return;
    }
    const id = matchExercise(name);
    setExerciseId(id);
    setExerciseOther(id === "other" ? name : "");
    setConfirmed(true);
    clearResult();
  }

  /** "아니요, 운동 다시 고를게요": 사진·메모는 그대로 두고 운동 고르기 화면으로 돌아간다. */
  function handleReselect() {
    setResult(null);
    setConfirmed(false);
    setSlideIndex(0);
    setShowOther(false);
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
    setLimitReached(false);
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

    // 하루 10회를 넘으면 요청을 보내지 않는다. (심한 증상 안내는 위에서 먼저 보여 주므로 횟수와 무관하다.)
    if (getUsage().count >= DAILY_LIMIT) {
      setLimitReached(true);
      return;
    }

    setChecking(true);
    try {
      const imageDataUrl = await prepareImage(photo);
      // 요청을 보내는 순간 1회로 센다. 성공·실패와 무관하다. (사진 오류·입력 누락처럼 보내기 전에 막은 경우는 세지 않는다.)
      setUsageCount(incrementUsage().count);
      const request: FeedbackRequest = { ...base, imageDataUrl };
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3" hidden={!isClient}>
      {result ? (
        /* 결과 화면: 입력 화면을 대신한다. 입력한 사진·메모는 그대로 남아 있어 "다시 촬영"으로 돌아갈 수 있다. */
        <>
          {result.status !== "mismatch" && (
            <button type="button" onClick={() => setResult(null)} className="sf-btn-secondary self-start">
              ← 다시 촬영하기
            </button>
          )}
          <FeedbackResult
            result={result}
            guide={guide}
            onConfirmExercise={() => void sendFeedback(true)}
            onReselect={handleReselect}
            busy={checking}
          />
        </>
      ) : !confirmed ? (
        /* 1단계: 큰 운동 카드 하나를 옆으로 넘겨 보고, 누르면 그 운동으로 정한다. */
        <div className="flex flex-col gap-5 pt-2">
          <button type="button" onClick={() => setConfirmed(true)} className="sf-btn-secondary self-start">
            ← 돌아가기
          </button>
          <h1 className="sf-title">어떤 운동을 할까요?</h1>
          <div className="relative">
            <div
              ref={slideRef}
              onScroll={handleSlideScroll}
              aria-label="운동 목록"
              className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {SLIDE_EXERCISE_IDS.map((id) => (
                <div key={id} className="w-full shrink-0 snap-center px-4">
                  <button
                    type="button"
                    onClick={() => selectExercise(id)}
                    className="flex w-full flex-col items-center gap-3 rounded-3xl border border-foreground/15 bg-background p-5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 그림이라 최적화가 필요 없다 */}
                    <img src={EXERCISE_GUIDES[id].imagePath} alt="" className="h-[30dvh] max-h-64 w-full object-contain" />
                    <span className="text-2xl font-bold">{EXERCISE_GUIDES[id].name}</span>
                    <span className="sf-btn flex w-full items-center justify-center">선택하기</span>
                  </button>
                </div>
              ))}
            </div>
            {/* 좌우 화살표 (손가락으로 밀어도 되고, 마우스는 화살표를 누른다) */}
            <button type="button" onClick={() => moveSlide(-1)} aria-label="이전 운동" disabled={slideIndex === 0}
              className="absolute top-1/3 left-0 size-11 rounded-full bg-background/90 text-xl shadow disabled:hidden">‹</button>
            <button type="button" onClick={() => moveSlide(1)} aria-label="다음 운동" disabled={slideIndex === SLIDE_EXERCISE_IDS.length - 1}
              className="absolute top-1/3 right-0 size-11 rounded-full bg-background/90 text-xl shadow disabled:hidden">›</button>
          </div>

          {/* 목록에 없는 운동은 작은 글씨로만 둔다. (기타, 베타) */}
          {!showOther ? (
            <button type="button" onClick={() => setShowOther(true)} className="min-h-11 text-sm text-foreground/60 underline underline-offset-4">
              다른 운동 직접 입력
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                id="exercise"
                type="text"
                value={exerciseText}
                onChange={(event) => {
                  setExerciseText(event.target.value);
                  setErrors({});
                }}
                maxLength={EXERCISE_OTHER_MAX_LENGTH}
                placeholder="운동 이름 (예: 데드리프트)"
                aria-label="운동 이름"
                aria-invalid={errors.exerciseOther ? true : undefined}
                autoComplete="off"
                autoFocus
                className="sf-input"
              />
              <FieldError message={errors.exerciseOther} />
              <button type="submit" className="sf-btn-secondary">확인</button>
            </div>
          )}
        </div>
      ) : (
        /* 홈: 안내 배너 → 오늘의 운동 → 자세 사진·메모 → 피드백 요청 (카드 구성) */
        <>
          <section className="flex items-center gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-accent/15 to-accent/5 p-5">
            <div className="flex flex-1 flex-col gap-2">
              <h1 className="text-xl leading-snug font-bold break-keep">
                지금, 내 몸에 맞는
                <br />
                <span className="text-accent">안전한 운동</span>을 시작해요!
              </h1>
              <p className="text-xs text-foreground/70">세이프핏이 당신의 안전한 운동을 도와드려요.</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 그림이라 최적화가 필요 없다 */}
            <img src="/hero.svg" alt="" className="size-24 shrink-0" />
          </section>

          <section aria-label="오늘의 운동" className="sf-card flex flex-col gap-3">
            <h2 className="sf-h2 flex items-center gap-2 text-accent">
              <DumbbellIcon />
              <span className="text-foreground">오늘의 운동</span>
            </h2>
            {/* 누르면 운동 고르기(슬라이드)로 간다. */}
            <button
              type="button"
              onClick={() => {
                setConfirmed(false);
                setSlideIndex(0);
                setShowOther(false);
                clearResult();
              }}
              aria-label={`운동 바꾸기, 지금 ${exerciseId === "other" ? exerciseOther : guide.name}`}
              className="flex items-center gap-3 rounded-2xl bg-accent/10 p-2 text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 작은 SVG 그림이라 최적화가 필요 없다 */}
              <img src={guide.imagePath} alt={guide.imageAlt} className="size-24 shrink-0 rounded-xl bg-white object-contain" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xl font-bold">{exerciseId === "other" ? exerciseOther : guide.name}</span>
                <span className="text-sm text-foreground/70">
                  {exerciseId === "other" ? "베타 · 정확도 미보장" : `찍을 순간 · ${guide.shootMoment}`}
                </span>
              </span>
              <span className="text-foreground/50"><ChevronRightIcon /></span>
            </button>

            <div className="flex items-center gap-3 rounded-2xl bg-accent/10 p-3">
              <span className="text-accent"><BulbIcon /></span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-sm font-semibold">촬영 가이드</p>
                <p className="text-xs text-foreground/70">전신이 보이도록, 옆모습으로 찍어 주세요!</p>
                <p className="text-xs text-foreground/70">{guide.cameraNote}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStepsOpen(true)}
              className="min-h-11 self-start text-sm font-medium text-accent underline underline-offset-4"
            >
              하는 법·유의사항 보기
            </button>
          </section>

          <section aria-label="자세 사진과 메모" className="sf-card flex flex-col gap-3">
            <h2 className="sf-h2 flex items-center gap-2 text-accent">
              <CameraIcon />
              <span className="text-foreground">자세 사진 올리기</span>
            </h2>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="photo"
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/40 p-3 text-center has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              >
                {photo && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 사용자가 고른 사진의 임시 미리보기라 최적화 대상이 아니다
                  <img src={previewUrl} alt="선택한 자세 사진 미리보기" className="max-h-56 w-full rounded-lg object-contain" />
                ) : (
                  <>
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <CameraIcon size={28} />
                    </span>
                    <span className="text-sm font-medium">사진을 선택하거나 촬영하세요</span>
                    <span className="text-xs text-foreground/60">20MB 이하, 가로·세로 모두 가능</span>
                  </>
                )}
                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhoto}
                  className="sr-only"
                />
              </label>
              {photo && <p className="text-center text-xs text-foreground/60">다른 사진으로 바꾸려면 사진을 다시 누르세요</p>}
              <FieldError message={errors.photo} />
            </div>

            <h2 className="sf-h2 mt-1 flex items-center gap-2 text-accent">
              <ChatIcon />
              <label htmlFor="memo" className="text-foreground">
                오늘의 메모 <span className="text-sm font-normal text-foreground/60">(선택사항)</span>
              </label>
            </h2>
            <textarea
              id="memo"
              value={memo}
              onChange={(event) => {
                setMemo(event.target.value);
                clearResult();
              }}
              maxLength={MEMO_MAX_LENGTH}
              rows={2}
              placeholder="예: 무릎이 아파요, 또는 특이사항을 적어 주세요"
              className="sf-input py-2"
            />
            <p className="-mt-1 text-right text-xs text-foreground/60">{memo.length} / {MEMO_MAX_LENGTH}</p>
            <FieldError message={errors.memo} />
          </section>

          <button type="submit" disabled={checking} className="sf-btn flex items-center justify-center gap-2 shadow-md">
            <SendIcon />
            {checking ? "분석 중… (최대 30초)" : "피드백 요청하기"}
          </button>
          <p className="text-center text-xs text-foreground/60">
            오늘 남은 횟수 <strong className="text-foreground">{remaining}/{DAILY_LIMIT}</strong>
          </p>
          {limitReached && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="text-sm font-medium">
                오늘은 {DAILY_LIMIT}회를 모두 사용했어요. 내일 다시 이용해 주세요.
              </p>
              {detectPain(memo) && <PainNotice />}
            </div>
          )}
          {requestError && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="sf-error">
                {requestError}
              </p>
              {/* 서버 응답이 없어도 통증 안내는 사라지지 않는다. (메모는 브라우저가 직접 감지한다.) */}
              {detectPain(memo) && <PainNotice />}
              <button
                type="button"
                onClick={() => void sendFeedback(lastConfirmedRef.current)}
                disabled={checking}
                className="sf-btn-secondary"
              >
                다시 시도
              </button>
            </div>
          )}
        </>
      )}

      {/* 하는 법·유의사항: 화면 아래에서 올라오는 창 (입력 화면이 길어지지 않게) */}
      {stepsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${guide.name} 하는 법`}
          className="fixed inset-0 z-20 flex items-end bg-black/40"
          onClick={() => setStepsOpen(false)}
        >
          <div
            className="mx-auto flex max-h-[80dvh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-2xl bg-background p-4 text-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="sf-h2">{guide.name} 하는 법</h2>
            {guide.steps.length > 0 ? (
              <ol className="list-decimal space-y-1 pl-5">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="text-foreground/70">이 운동은 정해 둔 안내가 없어요. 평소 하던 자세 그대로 찍어 주세요.</p>
            )}
            <ul className="list-disc space-y-1 pl-5 text-foreground/70">
              {COMMON_GUIDE_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <button type="button" onClick={() => setStepsOpen(false)} className="sf-btn">닫기</button>
          </div>
        </div>
      )}
    </form>
  );
}

/** 입력칸 아래에 보여 주는 오류 문구 */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="sf-error">
      {message}
    </p>
  );
}
