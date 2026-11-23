"use client";

// Design Ref: §5.3 동의 화면 — 외부 AI 서비스 전송·보관 안내, AI 분석 주의 문구, 촬영 안내를 보여 주고
// 체크해야 "시작하기"를 누를 수 있게 한다. (PLAN 4번)
// Design Ref: §7 — 동의 기록은 브라우저에만 저장한다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveConsent } from "@/lib/storage";

// Design Ref: §5.4 — 동의 화면 안내 문구 4가지
const NOTICES = [
  "사진, 메모, 몸 정보가 AI 분석을 위해 외부 AI 서비스로 전송됩니다.",
  "우리 서버는 저장하지 않으며, AI 서비스의 보관 정책은 해당 서비스 약관을 따릅니다.",
  "AI가 분석한 결과라 실제로 올바른 자세와 다르거나 내 몸에 맞지 않을 수 있습니다.",
  "얼굴이 나오지 않게 찍어 주세요.",
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
    <section aria-labelledby="consent-title" className="flex flex-col gap-5">
      <h1 id="consent-title" className="sf-title">
        시작하기 전에 확인해 주세요
      </h1>

      <ul className="flex flex-col gap-3 text-sm leading-relaxed">
        {NOTICES.map((text) => (
          <li key={text} className="flex gap-2">
            <span aria-hidden="true" className="text-foreground/50">
              •
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>

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
