// 세이프핏 로고: 팔을 벌린 사람(파랑)과 아래에서 받쳐 주는 곡선(초록)을 단순하게 그렸다.

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="세이프핏 로고">
      <path d="M6 38c10-2 18-8 24-18" fill="none" stroke="#34b27b" strokeWidth="7" strokeLinecap="round" />
      <path d="M12 22 24 26 40 10" fill="none" stroke="#3b68dc" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 26 30 40" fill="none" stroke="#3b68dc" strokeWidth="7" strokeLinecap="round" />
      <circle cx="33" cy="8" r="5" fill="#3b68dc" />
    </svg>
  );
}
