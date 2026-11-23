// 안전 안내 화면: 통증·심한 증상·AI 결과에 대한 주의를 모아 보여 준다. (하단 탭 "안전 안내")
// 문구는 PRD 5번(주요 기능의 안전 규칙)과 같은 뜻이다.

import type { Metadata } from "next";

export const metadata: Metadata = { title: "안전 안내 · 세이프핏" };

export default function SafetyPage() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="sf-title">안전 안내</h1>

      <section className="rounded-3xl border-2 border-red-600 bg-red-50 p-4 text-red-900 dark:bg-red-950/50 dark:text-red-100">
        <h2 className="text-base font-bold">이럴 땐 즉시 중단하고 병원·119에 상담하세요</h2>
        <p className="mt-1 text-sm">가슴 통증, 어지러움, 숨이 차거나 숨쉬기 힘든 느낌, 심한 부기가 있을 때</p>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">통증이 있으면</h2>
        <p className="text-sm">운동을 바로 멈추세요. 통증이 계속되면 전문가와 상담하세요.</p>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">AI 결과는 참고용이에요</h2>
        <p className="text-sm">
          AI가 분석한 결과라 실제로 올바른 자세와 다르거나 내 몸에 맞지 않을 수 있습니다. 참고용으로만 활용하고, 통증이
          있으면 즉시 중단하세요.
        </p>
        <p className="text-sm text-foreground/70">세이프핏은 참고용 자세 안내이며 의료 진단이 아닙니다.</p>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">사진을 찍을 때</h2>
        <p className="text-sm">얼굴이 나오지 않게 찍어 주세요. 혼자 찍기 어려우면 폰을 세워 타이머로 찍거나 다른 사람에게 부탁하세요.</p>
      </section>
    </div>
  );
}
