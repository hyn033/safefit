import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 같은 와이파이의 휴대폰에서 개발 서버(PC의 IP 주소)로 접속해 볼 수 있게 허용한다. (개발 중에만 쓰이고 배포에는 영향이 없다)
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
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
