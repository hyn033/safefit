// Design Ref: §3.1, §4.2 — 사진을 서버로 보내기 전에 약 1MB 이하 JPEG로 줄인다. (PLAN 9번)
// 브라우저에서만 쓴다. 줄인 사진은 메모리에만 있고 어디에도 저장하지 않는다.

import { PHOTO_FORMAT_MESSAGE } from "./validate";

/** 줄인 사진(data URL 글자)의 목표 길이. base64라 실제 용량은 약 1MB이다. */
const TARGET_LENGTH = 1_400_000;
const MAX_SIDE_PX = 1280;
const MIN_SIDE_PX = 480;

/** 사진을 읽거나 줄이지 못했을 때 (예: HEIC처럼 브라우저가 못 여는 형식) */
export class ImagePrepareError extends Error {}

/** 사진 파일을 JPEG data URL로 줄인다. 실패하면 ImagePrepareError */
export async function prepareImage(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepareError(PHOTO_FORMAT_MESSAGE);
  }

  try {
    let maxSide = MAX_SIDE_PX;
    while (true) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new ImagePrepareError("사진을 처리하지 못했어요. 다른 사진으로 시도해 주세요.");
      // PNG의 투명한 부분이 검게 보이지 않도록 흰 바탕을 깐다.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.7, 0.55]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length <= TARGET_LENGTH) return dataUrl;
      }
      if (maxSide <= MIN_SIDE_PX) {
        throw new ImagePrepareError("사진이 너무 커서 줄이지 못했어요. 다른 사진으로 시도해 주세요.");
      }
      maxSide = Math.round(maxSide * 0.75);
    }
  } finally {
    bitmap.close();
  }
}
