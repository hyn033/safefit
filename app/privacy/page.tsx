// 개인정보 처리 안내 화면: 어떤 정보를 어디로 보내고 어디에 저장하는지 쉬운 말로 알려 준다.
// 동의 전에도 볼 수 있어야 한다. (AccessGate가 이 주소는 막지 않는다)
// 공개 전에 운영자 문의처를 채우고 법률 검토를 받아야 한다. (초안)

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "개인정보 처리 안내 · 세이프핏" };

export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="sf-title">개인정보 처리 안내</h1>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">이렇게 받아요</h2>
        <p className="text-sm">자세 사진, 오늘 메모, 성별, 키, 체중, 아픈 곳을 입력받아요. 건강과 관련된 정보(아픈 곳 등)가 들어 있어요.</p>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">어디로 보내나요</h2>
        <p className="text-sm">
          피드백을 요청하는 순간에만 위 정보가 AI 분석을 위해 외부 AI 서비스(OpenAI, 미국)로 전송돼요. 해외로 전송되는 것에 해당해요.
        </p>
        <p className="text-sm text-foreground/70">
          우리 서버는 사진·메모·몸 정보를 저장하거나 기록하지 않아요. 전송된 정보를 OpenAI가 얼마나 보관하는지는 OpenAI의 정책을 따라요.
        </p>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">내 기기에는 이것만 저장돼요</h2>
        <p className="text-sm">동의 기록, 몸 정보(성별·키·체중·아픈 곳), 오늘 사용 횟수만 이 브라우저에 저장돼요. 사진과 AI 결과는 저장하지 않아요.</p>
        <p className="text-sm text-foreground/70">브라우저의 사이트 데이터를 지우면 모두 사라져요. 로그인과 회원가입은 없어요.</p>
      </section>

      <section className="sf-card flex flex-col gap-2">
        <h2 className="sf-h2">이용 연령</h2>
        <p className="text-sm">만 14세 이상만 이용할 수 있어요.</p>
      </section>

      <Link href="/safety" className="sf-btn-secondary text-center">
        안전 안내 보기
      </Link>
    </div>
  );
}
