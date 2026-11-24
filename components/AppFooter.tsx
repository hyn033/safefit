"use client";

// Design Ref: §5.2 — 하단 고정 영역. 홈·이용 안내·안전 안내 화면에서만 탭 3개(홈 / 이용 안내 / 안전 안내)를 보여 준다.
// ("의료 진단이 아닙니다" 안내는 결과 화면 아래와 안전 안내 화면에 있다.)

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HomeIcon, InfoIcon, ShieldIcon } from "@/components/Icons";

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/", label: "홈", icon: <HomeIcon /> },
  { href: "/usage", label: "이용 안내", icon: <InfoIcon /> },
  { href: "/safety", label: "안전 안내", icon: <ShieldIcon /> },
];

export default function AppFooter() {
  const pathname = usePathname();
  const showTabs = TABS.some((tab) => tab.href === pathname);
  // 탭이 없는 화면(동의·몸 정보)에서는 빈 막대가 남지 않게 아무것도 그리지 않는다.
  if (!showTabs) return null;

  return (
    <footer
      aria-label="안내"
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] rounded-[28px] bg-card/85 px-1 py-1 shadow-[0_18px_40px_-14px_rgba(60,90,190,0.45)] ring-1 ring-white/60 backdrop-blur dark:ring-foreground/10"
    >
      <nav aria-label="주요 화면" className="grid grid-cols-3">
          {TABS.map((tab) => {
            const active = tab.href === pathname;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-accent" : "text-foreground/55"
                }`}
              >
                <span className={`flex h-7 w-14 items-center justify-center rounded-full transition ${active ? "bg-accent/12" : ""}`}>{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}
      </nav>
    </footer>
  );
}
