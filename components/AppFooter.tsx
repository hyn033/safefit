"use client";

// Design Ref: §5.2 — 하단 고정 영역. 의료 진단이 아니라는 안내는 모든 화면에 항상 보이고,
// 홈·이용 안내·안전 안내 화면에서는 그 아래에 탭 3개(홈 / 이용 안내 / 안전 안내)를 함께 보여 준다.

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

  return (
    <footer
      aria-label="안내"
      className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-foreground/10 bg-card pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
    >
      <p className="px-4 pt-1 text-center text-xs text-foreground/60">참고용 자세 안내이며 의료 진단이 아닙니다</p>
      {showTabs && (
        <nav aria-label="주요 화면" className="grid grid-cols-3">
          {TABS.map((tab) => {
            const active = tab.href === pathname;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-accent" : "text-foreground/60"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </footer>
  );
}
