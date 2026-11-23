"use client";

// Design Ref: §5.2 — 상단 바 오른쪽의 설정(톱니바퀴) 버튼은 몸 정보 수정 화면으로 간다.
// 동의와 몸 정보가 모두 있을 때만 보여, 안내 화면으로 이동하는 짧은 순간에 깜빡이지 않게 한다.
// 몸 정보·동의 화면 자신에서는 보이지 않는다.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasConsent, hasProfile } from "@/lib/storage";
import { GearIcon } from "@/components/Icons";

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

  if (pathname === "/profile" || pathname === "/consent" || !ready) return null;

  return (
    <Link
      href="/profile"
      aria-label="몸 정보 수정"
      className="ml-auto flex size-11 items-center justify-center rounded-full bg-card text-foreground/70 shadow-sm"
    >
      <GearIcon />
    </Link>
  );
}
