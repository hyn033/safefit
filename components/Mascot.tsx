// 세이프핏 마스코트 "핏이": 말랑한 젤리 고양이. 투명한 하늘색 몸 안에 진한 파랑 젤리 덩어리가 비치고, 졸린 눈과 볼터치가 있다.
// 색은 캐릭터 고유 색이라 밝은/어두운 화면 모두에서 같게 보인다. 글이 아닌 장식이므로 화면 읽기 프로그램은 건너뛴다.

import { useId } from "react";

export default function Mascot({ size = 72, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  const jelly = `${id}-jelly`;
  const core = `${id}-core`;
  const line = "#5a7fb3";
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
          <stop offset="0" stopColor="#f0f8ff" />
          <stop offset="1" stopColor="#a9d2f7" />
        </linearGradient>
        <linearGradient id={core} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cbcf2" />
          <stop offset="1" stopColor="#4a98e6" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="108" rx="40" ry="4" fill={line} opacity="0.15" />
      {/* 짧고 통통한 귀 */}
      <path d="M16 58 Q10 28 26 22 Q32 21 48 36 Z" fill={`url(#${jelly})`} stroke={line} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M104 58 Q110 28 94 22 Q88 21 72 36 Z" fill={`url(#${jelly})`} stroke={line} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M22 46 Q22 34 28 31 L38 38 Z" fill="#ffc2d6" opacity="0.7" />
      <path d="M98 46 Q98 34 92 31 L82 38 Z" fill="#ffc2d6" opacity="0.7" />
      {/* 둥글고 통통한 젤리 몸 */}
      <path
        d="M8 80 C6 52 28 34 60 34 C92 34 114 52 112 80 C111 98 94 106 60 106 C26 106 9 98 8 80 Z"
        fill={`url(#${jelly})`}
        stroke={line}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* 몸 속에 비치는 진한 파랑 젤리 덩어리 */}
      <path d="M68 62 C72 52 86 52 90 60 C100 60 106 70 99 78 C103 88 92 95 82 92 C72 96 60 88 66 80 C60 74 62 66 68 62 Z" fill={`url(#${core})`} stroke="#3f86d0" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M74 66 Q80 62 86 66" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* 반짝이는 하이라이트 */}
      <path d="M20 66 Q21 54 32 49" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.85" />
      <circle cx="21" cy="73" r="1.8" fill="#fff" opacity="0.85" />
      {/* 얼굴: 큰 졸린 눈 + 큰 볼터치 + 작은 입 */}
      <path d="M26 76 Q32 82 38 76" stroke={line} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M50 76 Q56 82 62 76" stroke={line} strokeWidth="3" strokeLinecap="round" fill="none" />
      <ellipse cx="25" cy="87" rx="6.5" ry="4" fill="#ff9fc0" opacity="0.75" />
      <ellipse cx="63" cy="87" rx="6.5" ry="4" fill="#ff9fc0" opacity="0.75" />
      <path d="M41 83 Q44 87 47 83 Q50 87 53 83" stroke={line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(-3 0)" />
      {/* 반짝이 */}
      <circle cx="111" cy="98" r="3.5" fill="#d6ebfc" stroke={line} strokeWidth="1.2" />
      <path d="M108 20 v8 M104 24 h8" stroke="#7cbcf2" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
