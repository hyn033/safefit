// 세이프핏 마스코트 "핏이": 말랑한 곰돌이 모양의 파란 친구. 배의 방패는 "안전"을 뜻한다.
// 색은 캐릭터 고유 색이라 밝은/어두운 화면 모두에서 같게 보인다. 글이 아닌 장식이므로 화면 읽기 프로그램은 건너뛴다.

import { useId } from "react";

export default function Mascot({ size = 72, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const body = `${id}-body`;
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`sf-bob shrink-0 ${className}`}
    >
      <defs>
        <radialGradient id={body} cx="0.35" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#9fc0ff" />
          <stop offset="1" stopColor="#3f6fef" />
        </radialGradient>
      </defs>
      {/* 그림자 */}
      <ellipse cx="60" cy="112" rx="30" ry="4" fill="#2f5fe8" opacity="0.16" />
      {/* 귀 */}
      <circle cx="29" cy="36" r="13" fill="#4a7bf2" />
      <circle cx="91" cy="36" r="13" fill="#4a7bf2" />
      <circle cx="29" cy="36" r="7" fill="#c3d6ff" />
      <circle cx="91" cy="36" r="7" fill="#c3d6ff" />
      {/* 발 */}
      <ellipse cx="42" cy="107" rx="12" ry="6.5" fill="#3560dc" />
      <ellipse cx="78" cy="107" rx="12" ry="6.5" fill="#3560dc" />
      {/* 팔: 오른쪽은 반갑게 인사 */}
      <circle cx="17" cy="82" r="8" fill="#4a7bf2" />
      <circle cx="104" cy="60" r="8" fill="#4a7bf2" />
      {/* 통통한 몸 */}
      <ellipse cx="60" cy="68" rx="45" ry="39" fill={`url(#${body})`} />
      <ellipse cx="36" cy="46" rx="10" ry="5" fill="#fff" opacity="0.35" transform="rotate(-30 36 46)" />
      {/* 배 + 방패 */}
      <ellipse cx="60" cy="94" rx="19" ry="11" fill="#fff" opacity="0.9" />
      <path d="M60 85 l6.5 2 v4.5 c0 4-3 6.5-6.5 8 c-3.5-1.5-6.5-4-6.5-8 v-4.5 z" fill="#2f5fe8" />
      <path d="M57 92 l2.4 2.4 4-4.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* 얼굴: 낮고 넓게 놓은 작은 눈이 귀여움의 핵심 */}
      <circle cx="42" cy="66" r="5.2" fill="#141b3d" />
      <circle cx="78" cy="66" r="5.2" fill="#141b3d" />
      <circle cx="43.8" cy="64" r="1.9" fill="#fff" />
      <circle cx="79.8" cy="64" r="1.9" fill="#fff" />
      <ellipse cx="31" cy="76" rx="7.5" ry="4.5" fill="#ff9db8" opacity="0.75" />
      <ellipse cx="89" cy="76" rx="7.5" ry="4.5" fill="#ff9db8" opacity="0.75" />
      <path d="M54 73 Q57 78.5 60 73 Q63 78.5 66 73" stroke="#141b3d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
