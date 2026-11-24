// 세이프핏 마스코트 "핏이": 말랑한 젤리 슬라임 고양이. 투명한 하늘색 몸에 졸린 눈, 안쪽의 진한 파랑 무늬가 포인트다.
// 색은 캐릭터 고유 색이라 밝은/어두운 화면 모두에서 같게 보인다. 글이 아닌 장식이므로 화면 읽기 프로그램은 건너뛴다.

import { useId } from "react";

export default function Mascot({ size = 72, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const jelly = `${id}-jelly`;
  const line = "#5b82b8";
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
        <linearGradient id={jelly} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3f1ff" />
          <stop offset="1" stopColor="#9cc9f4" />
        </linearGradient>
      </defs>
      {/* 바닥 그림자 */}
      <ellipse cx="60" cy="106" rx="42" ry="4" fill="#5b82b8" opacity="0.15" />
      {/* 고양이 귀 */}
      <path d="M22 60 Q18 30 31 26 Q36 25 54 43 Z" fill={`url(#${jelly})`} stroke={line} strokeWidth="2" strokeLinejoin="round" />
      <path d="M98 60 Q102 30 89 26 Q84 25 66 43 Z" fill={`url(#${jelly})`} stroke={line} strokeWidth="2" strokeLinejoin="round" />
      {/* 납작하게 퍼진 젤리 몸 */}
      <path
        d="M12 88 C8 60 30 42 60 42 C90 42 112 60 108 88 C107 99 96 103 60 103 C24 103 13 99 12 88 Z"
        fill={`url(#${jelly})`}
        stroke={line}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* 몸 안쪽의 진한 파랑 소용돌이 무늬 */}
      <path d="M64 64 C80 52 100 62 95 78 C92 90 72 93 68 83 C77 83 83 77 79 71 C75 65 66 69 64 64 Z" fill="#6fb2ee" opacity="0.9" />
      {/* 반짝이는 하이라이트 */}
      <ellipse cx="33" cy="57" rx="10" ry="3.6" fill="#fff" opacity="0.7" transform="rotate(-18 33 57)" />
      {/* 졸린 눈, 볼터치, 작은 입 */}
      <path d="M32 74 Q37 78 42 74" stroke={line} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M50 74 Q55 78 60 74" stroke={line} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <ellipse cx="30" cy="83" rx="5" ry="3" fill="#ffa8c4" opacity="0.7" />
      <ellipse cx="62" cy="83" rx="5" ry="3" fill="#ffa8c4" opacity="0.7" />
      <path d="M43 82 Q45.5 85.5 48 82 Q50.5 85.5 53 82" stroke={line} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* 반짝이 */}
      <circle cx="110" cy="96" r="3.5" fill="#cfe7fb" stroke={line} strokeWidth="1.2" />
    </svg>
  );
}
