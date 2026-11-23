// 세이프핏 로고: 팔을 벌린 사람(파랑)을 아래에서 받쳐 주는 곡선(초록). 흰 바탕 어디에나 놓이도록 배경 없이 단순하게 그렸다.

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="세이프핏 로고">
      <path d="M7 35Q24 49 41 35" fill="none" stroke="#34b27b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="24" cy="9" r="5" fill="#3b68dc" />
      <path d="M12 17 24 21 36 17M24 21V30M24 30 18 36M24 30 30 36" fill="none" stroke="#3b68dc" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
