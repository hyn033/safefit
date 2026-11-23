"use client";

// Design Ref: §5.3 몸 정보 화면 — 운동 경험, 부상 이력·불편한 부위, 체중을 입력받아 브라우저에만 저장한다. (PLAN 5번)
// 몸 정보가 없을 때는 처음 입력하는 화면, 이미 있을 때는 고쳐 쓰는(수정) 화면이 된다.
// Design Ref: §3.1 — 입력 검사 규칙은 lib/validate.ts를 쓴다.

import { useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getProfile, saveProfile } from "@/lib/storage";
import { INJURY_PARTS } from "@/lib/types";
import type { Experience, InjuryPart, Profile } from "@/lib/types";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG, validateProfileForm } from "@/lib/validate";
import type { ProfileFieldErrors, ProfileFormValues } from "@/lib/validate";

const EXPERIENCE_OPTIONS: { value: Experience; label: string }[] = [
  { value: "beginner", label: "처음" },
  { value: "under1y", label: "1년 미만" },
  { value: "over1y", label: "1년 이상" },
];

const INJURY_LABELS: Record<InjuryPart, string> = {
  knee: "무릎",
  back: "허리",
  shoulder: "어깨",
  ankle: "발목",
  wrist: "손목",
  neck: "목",
  other: "기타",
};

/** 저장된 몸 정보를 입력칸 값으로 바꾼다. 없으면 빈 입력칸 */
function toFormValues(profile: Profile | null): ProfileFormValues {
  if (!profile) {
    return { experience: "", noInjury: false, injuries: [], injuryOther: "", weight: "" };
  }
  return {
    experience: profile.experience,
    noInjury: profile.noInjury,
    injuries: profile.injuries,
    injuryOther: profile.injuryOther ?? "",
    weight: String(profile.weightKg),
  };
}

const subscribeNothing = () => () => {};

export default function ProfilePage() {
  // 이 버전의 Next.js는 이전에 열었던 화면의 입력 상태를 보관해 둔다.
  // 이 화면에 새로 들어올 때마다 저장된 몸 정보로 입력칸을 다시 채우도록 bfcacheId를 key로 쓴다.
  // (뒤로 가기·앞으로 가기에서는 입력하던 내용이 그대로 남는다.)
  const { bfcacheId } = useRouter();

  // 저장된 몸 정보는 브라우저에서만 읽을 수 있으므로, 브라우저에서 그려질 때부터 입력칸을 보여 준다.
  // (서버에서 그린 화면과 달라서 생기는 오류를 막기 위해서이다.)
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);
  if (!isClient) return null;
  return <ProfileForm key={bfcacheId} initialProfile={getProfile()} />;
}

function ProfileForm({ initialProfile }: { initialProfile: Profile | null }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(() => toFormValues(initialProfile));
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [saveFailed, setSaveFailed] = useState(false);

  function update(next: Partial<ProfileFormValues>) {
    setValues((current) => ({ ...current, ...next }));
    setErrors({});
    setSaveFailed(false);
  }

  function toggleInjury(part: InjuryPart) {
    const injuries = values.injuries.includes(part)
      ? values.injuries.filter((item) => item !== part)
      : [...values.injuries, part];
    // 부위를 고르면 "없음"은 풀린다. "기타"를 풀면 직접 입력한 글자도 지운다.
    update({
      noInjury: false,
      injuries,
      injuryOther: injuries.includes("other") ? values.injuryOther : "",
    });
  }

  function toggleNoInjury() {
    // "없음"은 다른 부위와 함께 고를 수 없으므로, 고르면 부위 선택을 모두 지운다.
    update({ noInjury: !values.noInjury, injuries: [], injuryOther: "" });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateProfileForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    // 시크릿 모드 등으로 저장이 막히면 안내만 보여 주고 멈춘다.
    if (!saveProfile(result.profile)) {
      setSaveFailed(true);
      return;
    }
    router.replace("/");
  }

  const hasOther = values.injuries.includes("other");

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {!initialProfile && (
        <p className="rounded-lg bg-foreground/5 px-3 py-2 text-sm">
          저장된 몸 정보가 없어요. 아래 내용을 입력해 주세요.
        </p>
      )}

      <h1 className="text-xl font-semibold">내 몸 정보</h1>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">운동 경험</legend>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-foreground/15 px-3 text-sm has-[:checked]:border-foreground has-[:checked]:bg-foreground/5"
            >
              <input
                type="radio"
                name="experience"
                value={option.value}
                checked={values.experience === option.value}
                onChange={() => update({ experience: option.value })}
                className="size-4 accent-foreground"
              />
              {option.label}
            </label>
          ))}
        </div>
        <FieldError id="experience-error" message={errors.experience} />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">부상 이력·불편한 부위 (여러 개 선택)</legend>
        <div className="flex flex-wrap gap-2">
          {INJURY_PARTS.map((part) => (
            <ToggleChip
              key={part}
              label={INJURY_LABELS[part]}
              pressed={values.injuries.includes(part)}
              onClick={() => toggleInjury(part)}
            />
          ))}
          <ToggleChip label="없음" pressed={values.noInjury} onClick={toggleNoInjury} />
        </div>
        <p className="text-xs text-foreground/60">&quot;없음&quot;은 다른 부위와 함께 고를 수 없어요.</p>
        <FieldError id="injuries-error" message={errors.injuries} />

        {hasOther && (
          <div className="mt-1 flex flex-col gap-1">
            <label htmlFor="injury-other" className="text-sm">
              기타 부위
            </label>
            <input
              id="injury-other"
              type="text"
              value={values.injuryOther}
              onChange={(event) => update({ injuryOther: event.target.value })}
              placeholder="예: 고관절"
              aria-invalid={errors.injuryOther ? true : undefined}
              aria-describedby={errors.injuryOther ? "injury-other-error" : undefined}
              className="h-11 rounded-lg border border-foreground/20 bg-background px-3 text-base"
            />
            <FieldError id="injury-other-error" message={errors.injuryOther} />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="weight" className="text-sm font-medium">
          체중
        </label>
        <div className="flex items-center gap-2">
          <input
            id="weight"
            type="text"
            inputMode="decimal"
            value={values.weight}
            onChange={(event) => update({ weight: event.target.value })}
            placeholder={`예: 70 (${WEIGHT_MIN_KG}~${WEIGHT_MAX_KG})`}
            aria-invalid={errors.weight ? true : undefined}
            aria-describedby={errors.weight ? "weight-error" : undefined}
            className="h-11 w-full rounded-lg border border-foreground/20 bg-background px-3 text-base"
          />
          <span className="text-sm">kg</span>
        </div>
        <FieldError id="weight-error" message={errors.weight} />
      </div>

      <p className="text-xs leading-relaxed text-foreground/60">
        브라우저 데이터를 지우거나 기기를 바꾸면 몸 정보를 다시 입력해야 합니다.
      </p>

      {saveFailed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          이 브라우저에서는 몸 정보를 저장할 수 없어요. 시크릿 모드나 저장 차단 설정을 끄고 다시 시도해 주세요.
        </p>
      )}

      <button
        type="submit"
        className="h-12 rounded-lg bg-foreground text-base font-medium text-background"
      >
        저장
      </button>
    </form>
  );
}

/** 눌러서 켜고 끄는 선택 버튼 (부상 부위 선택용) */
function ToggleChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-4 text-sm ${
        pressed
          ? "border-foreground bg-foreground text-background"
          : "border-foreground/15 bg-background text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

/** 입력 오류 문구 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
