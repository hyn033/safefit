"use client";

// Design Ref: §5.3 동의 화면 — 외부 AI 서비스 전송·보관 안내, AI 분석 주의 문구, 촬영 안내를 보여 주고
// 체크해야 "시작하기"를 누를 수 있게 한다. (PLAN 4번)
// Design Ref: §7 — 동의 기록은 브라우저에만 저장한다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveConsent } from "@/lib/storage";

// Design Ref: §5.4 — 동의 화면 안내 문구. 핵심 문장은 굵게 보여 한눈에 읽히게 하고, 내용은 줄이지 않는다.
const NOTICES: { title: string; body: string }[] = [
  {
    title: "사진·메모·몸 정보는 외부 AI 서비스로 전송돼요",
    body: "AI 분석을 위해서예요. 우리 서버는 저장하지 않으며, AI 서비스의 보관 정책은 해당 서비스 약관을 따릅니다.",
  },
  {
    title: "AI 결과는 틀릴 수 있어요",
    body: "실제로 올바른 자세와 다르거나 내 몸에 맞지 않을 수 있습니다. 참고용으로만 활용해 주세요.",
  },
  {
    title: "얼굴은 나오지 않게 찍어 주세요",
    body: "전신 옆모습이 나오면 충분해요.",
  },
];

export default function ConsentPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  function handleStart() {
    if (!checked) return;
    // 시크릿 모드 등으로 저장이 막히면 동의를 남길 수 없으므로 안내만 보여 주고 멈춘다.
    if (!saveConsent()) {
      setSaveFailed(true);
      return;
    }
    // 몸 정보가 없으면 AccessGate가 홈에서 /profile로 이어서 보낸다.
    router.replace("/");
  }

  return (
    <section aria-labelledby="consent-title" className="flex flex-col gap-5 pt-4">
      <h1 id="consent-title" className="sf-title">
        시작하기 전에 확인해 주세요
      </h1>

      <ol className="flex flex-col gap-3">
        {NOTICES.map((notice, index) => (
          <li key={notice.title} className="flex gap-3 rounded-2xl bg-foreground/[0.04] p-4">
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">{notice.title}</p>
              <p className="text-xs leading-relaxed text-foreground/70">{notice.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-foreground/15 px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
            setSaveFailed(false);
          }}
          className="size-5 shrink-0 accent-accent"
        />
        <span>위 내용을 확인했고 동의합니다</span>
      </label>

      {saveFailed && (
        <p role="alert" className="sf-error">
          이 브라우저에서는 동의를 저장할 수 없어요. 시크릿 모드나 저장 차단 설정을 끄고 다시 시도해 주세요.
        </p>
      )}

      <button
        type="button"
        onClick={handleStart}
        disabled={!checked}
        className="sf-btn"
      >
        시작하기
      </button>
    </section>
  );
}
