// 처음 접속했을 때 보이는 시작 화면: 서비스가 무엇인지 한눈에 알려 주고 "시작하기"로 동의 화면에 이어 준다.
// 동의한 적이 있으면 AccessGate가 이 화면을 건너뛰고 홈으로 보낸다.

import Link from "next/link";
import Mascot from "@/components/Mascot";

const STEPS = [
  { title: "운동 고르기", text: "내가 하려는 운동을 골라요." },
  { title: "자세 사진 올리기", text: "따라 하기 안내를 보고, 그 순간의 사진을 올려요." },
  { title: "선으로 확인하기", text: "옳은 자세와 같은 곳은 초록, 다른 곳은 빨강으로 보여 드려요." },
];

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center gap-5 pt-4 text-center">
      <Mascot size={96} />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
          내 몸에 맞는
          <br />
          <span className="text-accent">안전한 자세</span>를 알려 드려요
        </h1>
        <p className="text-sm text-foreground/70">자세 사진 한 장으로, 어디가 다른지 쉬운 말로 확인해 보세요.</p>
      </div>

      <ol className="flex w-full flex-col gap-3 text-left">
        {STEPS.map((step, index) => (
          <li key={step.title} className="sf-card flex items-center gap-3 text-left">
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-accent to-accent-deep text-sm font-bold text-accent-foreground shadow-[0_6px_12px_-6px_rgba(33,73,196,0.8)]">{index + 1}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-bold">{step.title}</span>
              <span className="text-sm text-foreground/70">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <Link href="/consent" className="sf-btn flex w-full items-center justify-center text-center">
        시작하기
      </Link>
      <p className="text-xs text-foreground/60">참고용 자세 안내이며 의료 진단이 아닙니다.</p>
    </div>
  );
}
