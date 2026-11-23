// 이용 안내 화면: 사용 순서와 알아둘 점을 짧게 보여 준다. (하단 탭 "이용 안내")
// 동의·몸 정보가 없으면 AccessGate가 먼저 해당 화면으로 보낸다.

import type { Metadata } from "next";
import { DAILY_LIMIT } from "@/lib/storage";

export const metadata: Metadata = { title: "이용 안내 · 세이프핏" };

const STEPS = [
  "오늘의 운동을 골라요. (홈에서 운동 카드를 누르면 바꿀 수 있어요)",
  "안내 그림의 '찍을 순간'에 맞춰 전신 옆모습 사진을 찍어요.",
  "자세에 대해 궁금한 점이 있으면 적어서 물어보세요. (선택)",
  "'피드백 요청하기'를 누르면 내 몸에 맞는 수정 방법을 알려 줘요.",
];

export default function UsagePage() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="sf-title">이용 안내</h1>

      <section className="sf-card flex flex-col gap-3">
        <h2 className="sf-h2">이렇게 사용해요</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">알아 두세요</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>하루에 {DAILY_LIMIT}회까지 피드백을 받을 수 있어요.</li>
          <li>사진은 우리 서버에 저장하지 않고, 피드백을 받는 순간에만 AI 서비스로 전달돼요.</li>
          <li>몸 정보는 이 브라우저에만 저장돼요. 오른쪽 위 톱니바퀴에서 고칠 수 있어요.</li>
          <li>목록에 없는 운동은 정확도가 낮을 수 있어요. (베타)</li>
        </ul>
      </section>
    </div>
  );
}
