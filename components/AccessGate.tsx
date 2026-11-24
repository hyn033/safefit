"use client";

// Design Ref: §5.1, §7 — 어느 화면에서 시작하든 아래 순서를 지키도록 화면 이동을 맡는다.
//   1) 동의가 없으면 /consent로 보낸다. (동의한 사람이 /consent에 오면 홈 /으로 보낸다.)
//   2) 동의했지만 몸 정보가 없으면 /profile로 보낸다. (몸 정보가 있으면 /profile은 "수정" 화면이 된다.)
// 동의·몸 정보는 브라우저 저장소에만 있으므로 화면이 그려진 뒤(브라우저에서)에 확인한다.
// 확인하는 동안과 이동하는 동안에는 내용을 숨겨서 화면이 깜빡이지 않게 한다.

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasConsent, hasProfile } from "@/lib/storage";

/** 다른 탭에서 저장값이 바뀌는 경우를 따라간다. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const CONSENT_PATH = "/consent";
const PROFILE_PATH = "/profile";

/** 지금 화면에서 다른 화면으로 보내야 하면 그 주소를, 아니면 null을 돌려준다. */
function getRedirectPath(
  pathname: string,
  consented: boolean | null,
  profileSaved: boolean | null,
): string | null {
  // 아직 확인 중
  if (consented === null || profileSaved === null) return null;
  // 개인정보 처리 안내는 동의 전에도 볼 수 있어야 한다.
  if (pathname === "/privacy") return null;

  if (!consented) return pathname === CONSENT_PATH ? null : CONSENT_PATH;
  if (pathname === CONSENT_PATH) return "/";
  if (!profileSaved && pathname !== PROFILE_PATH) return PROFILE_PATH;
  return null;
}

export default function AccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // 서버에서 그릴 때는 알 수 없으므로 null(확인 중)로 둔다.
  const consented = useSyncExternalStore<boolean | null>(subscribe, hasConsent, () => null);
  const profileSaved = useSyncExternalStore<boolean | null>(subscribe, hasProfile, () => null);

  const redirectTo = getRedirectPath(pathname, consented, profileSaved);

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // 확인이 끝났고 이동할 곳이 없을 때만 보여 준다.
  // (내용을 아예 빼면 Next.js가 화면을 미리 그리는 과정에서 이 화면을 건너뛰었다고 경고하므로, 그려 두고 숨긴다.)
  const visible = consented !== null && profileSaved !== null && redirectTo === null;

  return <div hidden={!visible}>{children}</div>;
}
