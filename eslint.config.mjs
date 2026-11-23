import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 삭제 대기 폴더(CLAUDE.md 5번)는 검사하지 않는다.
    "trash-can/**",
    // 가져다 둔 몸 인식 실행 파일(외부에서 만든 코드)은 검사하지 않는다.
    "public/mediapipe/**",
  ]),
]);

export default eslintConfig;
