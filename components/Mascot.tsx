// 세이프핏 마스코트 "핏이": 말랑하게 동글동글한 파란 친구. 가슴의 방패는 "안전"을 뜻한다.
// 색은 캐릭터 고유 색이라 밝은/어두운 화면 모두에서 같게 보인다. 글이 아닌 장식이므로 화면 읽기 프로그램은 건너뛴다.

import { useId } from "react";

export default function Mascot({ size = 72, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const body = `${id}-body`;
  const eye = `${id}-eye`;
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
        <radialGradient id={body} cx="0.35" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#a9c6ff" />
          <stop offset="0.55" stopColor="#5b8dff" />
          <stop offset="1" stopColor="#2f5fe8" />
        </radialGradient>
        <radialGradient id={eye} cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#3b4a8a" />
          <stop offset="1" stopColor="#141b3d" />
        </radialGradient>
      </defs>
      {/* 그림자 */}
      <ellipse cx="60" cy="112" rx="28" ry="4" fill="#2f5fe8" opacity="0.18" />
      {/* 발 */}
      <ellipse cx="45" cy="106" rx="11" ry="6" fill="#2a56d6" />
      <ellipse cx="75" cy="106" rx="11" ry="6" fill="#2a56d6" />
      {/* 작은 팔: 오른쪽은 인사 */}
      <ellipse cx="19" cy="76" rx="7" ry="9" fill="#4a7bf2" transform="rotate(20 19 76)" />
      <ellipse cx="101" cy="62" rx="7" ry="10" fill="#4a7bf2" transform="rotate(-25 101 62)" />
      {/* 머리 위 물방울 모양 포인트 */}
      <path d="M60 10 C66 18 70 22 70 28 a10 10 0 0 1 -20 0 C50 22 54 18 60 10 Z" fill="#7aa2ff" />
      <ellipse cx="57" cy="25" rx="2.4" ry="3.6" fill="#fff" opacity="0.7" transform="rotate(15 57 25)" />
      {/* 몸 (머리와 하나로 둥글게) */}
      <ellipse cx="60" cy="68" rx="42" ry="39" fill={`url(#${body})`} />
      {/* 반짝이는 하이라이트 */}
      <ellipse cx="38" cy="45" rx="11" ry="6" fill="#fff" opacity="0.4" transform="rotate(-35 38 45)" />
      {/* 큰 눈 */}
      <ellipse cx="44" cy="64" rx="8" ry="9.5" fill={`url(#${eye})`} />
      <ellipse cx="76" cy="64" rx="8" ry="9.5" fill={`url(#${eye})`} />
      <circle cx="47" cy="60" r="3.2" fill="#fff" />
      <circle cx="79" cy="60" r="3.2" fill="#fff" />
      <circle cx="42" cy="68" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="74" cy="68" r="1.5" fill="#fff" opacity="0.8" />
      {/* 볼터치 */}
      <ellipse cx="30" cy="77" rx="6.5" ry="4" fill="#ff9db8" opacity="0.7" />
      <ellipse cx="90" cy="77" rx="6.5" ry="4" fill="#ff9db8" opacity="0.7" />
      {/* 입: 작게 벌린 웃음 */}
      <path d="M54 76 Q60 85 66 76 Z" fill="#141b3d" strokeLinejoin="round" stroke="#141b3d" strokeWidth="2" />
      <path d="M57 80.5 Q60 83 63 80.5 Q60 79 57 80.5 Z" fill="#ff8aa8" />
      {/* 가슴 방패 */}
      <path d="M60 87 l8 2.5 v5 c0 5-3.5 7.5-8 9.5 c-4.5-2-8-4.5-8-9.5 v-5 z" fill="#fff" />
      <path d="M56 95 l3 3 5-6" stroke="#2f5fe8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
