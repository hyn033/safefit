// 세이프핏 로고: 파란 둥근 네모 안에 흰 방패와 체크 표시. (안전하게 맞는 자세라는 뜻을 단순하게 담았다)

export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="세이프핏 로고">
      <rect width="48" height="48" rx="12" fill="#3b68dc" />
      <path d="M24 9 36 13.5v10c0 7.5-5 13.2-12 15.5-7-2.300-12-8-12-15.500v-10z" fill="#fff" />
      <path d="m17.500 24 5 5 8.500-9.500" fill="none" stroke="#3b68dc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
