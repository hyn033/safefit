import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 같은 와이파이의 휴대폰에서 개발 서버(PC의 IP 주소)로 접속해 볼 수 있게 허용한다. (개발 중에만 쓰이고 배포에는 영향이 없다)
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  // 보안 헤더: 다른 사이트가 화면을 iframe으로 띄우는 것(클릭재킹)과 형식 추측을 막고, 카메라는 이 사이트에서만 허용한다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
