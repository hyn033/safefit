import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "세이프핏",
  description: "내 몸의 안전 한계선을 기준으로 운동 자세를 알려 주는 AI 홈트레이닝 파트너",
};

// Design Ref: §5.2 — 휴대폰 화면 기준(모바일 우선). viewportFit은 하단 고정 안내가 아이폰 아래쪽 영역에 가리지 않게 한다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Design Ref: §5.2 — 모든 화면의 공통 틀 (상단 바 + 화면별 내용 + 하단 고정 안내)
// (상단 바의 "몸 정보 수정" 버튼은 /profile 화면을 만드는 작업(PLAN 5번)에서 함께 추가한다.)
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-foreground/5">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col border-x border-foreground/10 bg-background">
          <header className="sticky top-0 z-10 flex h-12 items-center border-b border-foreground/10 bg-background px-4">
            <span className="text-base font-semibold">세이프핏</span>
          </header>

          <main className="flex-1 px-4 pt-4 pb-20">{children}</main>

          <footer
            aria-label="안내"
            className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md border-t border-foreground/10 bg-background px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-xs text-foreground/70"
          >
            참고용 자세 안내이며 의료 진단이 아닙니다
          </footer>
        </div>
      </body>
    </html>
  );
}
