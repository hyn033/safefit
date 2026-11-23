"use client";

// Design Ref: §5.1, §7 — 동의가 없으면 어느 화면에서든 /consent로 보내고, 동의한 사람이 /consent에 오면 홈(/)으로 보낸다.
// 동의 여부는 브라우저 저장소에만 있으므로 화면이 그려진 뒤(브라우저에서)에 확인한다.
// 확인하는 동안과 이동하는 동안에는 아무것도 보여 주지 않아 화면이 깜빡이지 않게 한다.

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasConsent } from "@/lib/storage";

/** 다른 탭에서 동의 기록이 바뀌는 경우를 따라간다. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const CONSENT_PATH = "/consent";

export default function ConsentGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // 서버에서 그릴 때는 알 수 없으므로 null(확인 중)로 둔다.
  const consented = useSyncExternalStore<boolean | null>(subscribe, hasConsent, () => null);
  const onConsentPage = pathname === CONSENT_PATH;

  useEffect(() => {
    if (consented === null) return;
    if (!consented && !onConsentPage) router.replace(CONSENT_PATH);
    if (consented && onConsentPage) router.replace("/");
  }, [consented, onConsentPage, router]);

  // 이 화면을 보여도 되는 경우: 동의 여부를 확인했고, 동의가 있으면 동의 화면이 아닌 곳 / 없으면 동의 화면
  // (확인 중이거나 다른 화면으로 이동 중이면 내용은 그려 두되 숨겨서 깜빡임을 막는다.
  //  내용을 아예 빼면 Next.js가 화면을 미리 그리는 과정에서 이 화면을 건너뛰었다고 경고한다.)
  const visible = consented !== null && consented !== onConsentPage;

  return <div hidden={!visible}>{children}</div>;
}
