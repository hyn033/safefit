import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AccessGate from "@/components/AccessGate";
import AppFooter from "@/components/AppFooter";
import Logo from "@/components/Logo";
import ProfileEditLink from "@/components/ProfileEditLink";

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
// 상단 바의 "몸 정보 수정" 버튼은 홈에서만 보인다. (Design Ref: §5.2)
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-foreground/5">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-2 bg-background px-4">
            <Logo size={40} />
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold">세이프핏</span>
              <span className="text-sm text-foreground/60">SafeFit</span>
            </div>
            <ProfileEditLink />
          </header>

          <main className="flex-1 px-4 pt-2 pb-28">
            {/* Design Ref: §5.1 — 동의가 없으면 /consent로, 몸 정보가 없으면 /profile로 보낸다. */}
            <AccessGate>{children}</AccessGate>
          </main>

          <AppFooter />
        </div>
      </body>
    </html>
  );
}
