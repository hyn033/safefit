"use client";

// Design Ref: §5.2 — 상단 바의 "몸 정보 수정" 버튼은 홈에서만 보인다.
// 동의와 몸 정보가 모두 있을 때만 보여, 안내 화면으로 이동하는 짧은 순간에 깜빡이지 않게 한다.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasConsent, hasProfile } from "@/lib/storage";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function isReady(): boolean {
  return hasConsent() && hasProfile();
}

export default function ProfileEditLink() {
  const pathname = usePathname();
  // 서버에서 그릴 때는 false(안 보임)
  const ready = useSyncExternalStore(subscribe, isReady, () => false);

  if (pathname !== "/" || !ready) return null;

  return (
    <Link
      href="/profile"
      className="ml-auto flex min-h-11 items-center px-1 text-sm text-foreground/70 underline underline-offset-4"
    >
      몸 정보 수정
    </Link>
  );
}
