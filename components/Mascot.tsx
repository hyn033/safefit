// 세이프핏 마스코트 "핏이": 파란 실루엣 고양이. 흰 점 눈과 수염, 말린 꼬리만 있는 아주 단순한 모양.
// 색은 캐릭터 고유 색이라 밝은/어두운 화면 모두에서 같게 보인다. 글이 아닌 장식이므로 화면 읽기 프로그램은 건너뛴다.

import { useId } from "react";

export default function Mascot({ size = 72, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const fill = `${id}-fill`;
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
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a6fd0" />
          <stop offset="1" stopColor="#3556b0" />
        </linearGradient>
      </defs>
      <ellipse cx="58" cy="106" rx="36" ry="3.5" fill="#3556b0" opacity="0.15" />
      {/* 말린 꼬리 */}
      <path d="M92 98 C112 100 116 78 104 72" stroke={`url(#${fill})`} strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* 귀가 달린 둥근 몸 */}
      <path
        d="M22 98 C14 76 22 56 40 48 L38 26 L55 40 C59 39 63 39 67 40 L84 26 L82 48 C100 56 106 76 98 98 C94 106 26 106 22 98 Z"
        fill={`url(#${fill})`}
        strokeLinejoin="round"
      />
      {/* 눈 */}
      <circle cx="48" cy="68" r="4" fill="#fff" />
      <circle cx="72" cy="68" r="4" fill="#fff" />
      {/* 수염 */}
      <g stroke="#cfdcff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
        <path d="M36 75 L18 72" />
        <path d="M36 80 L19 84" />
        <path d="M84 75 L102 72" />
        <path d="M84 80 L101 84" />
      </g>
    </svg>
  );
}
