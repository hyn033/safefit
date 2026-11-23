"use client";

// Design Ref: §5.3 몸 정보 화면 — 성별, 부상 이력·불편한 부위, 키·체중을 입력받아 브라우저에만 저장한다. (PLAN 5번)
// 몸 정보가 없을 때는 처음 입력하는 화면, 이미 있을 때는 고쳐 쓰는(수정) 화면이 된다.
// Design Ref: §3.1 — 입력 검사 규칙은 lib/validate.ts를 쓴다.

import { useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GENDER_LABELS, INJURY_LABELS } from "@/lib/labels";
import { getProfile, saveProfile } from "@/lib/storage";
import { GENDERS, INJURY_PARTS } from "@/lib/types";
import type { InjuryPart, Profile } from "@/lib/types";
import { INJURY_OTHER_MAX_LENGTH, validateProfileForm } from "@/lib/validate";
import type { ProfileFieldErrors, ProfileFormValues } from "@/lib/validate";

/** 저장된 몸 정보를 입력칸 값으로 바꾼다. 없으면 빈 입력칸 */
function toFormValues(profile: Profile | null): ProfileFormValues {
  if (!profile) {
    return { gender: "", noInjury: false, injuries: [], injuryOther: "", height: "", weight: "" };
  }
  return {
    gender: profile.gender ?? "",
    noInjury: profile.noInjury,
    injuries: profile.injuries,
    injuryOther: profile.injuryOther ?? "",
    height: profile.heightCm ? String(profile.heightCm) : "",
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-1">
        <h1 className="sf-title">내 몸 정보</h1>
        <p className="text-sm text-foreground/70">
          {initialProfile ? "내 몸에 맞는 안내를 위해 사용돼요." : "저장된 몸 정보가 없어요. 한 번만 입력해 주세요."}
        </p>
      </div>

      {/* 성별: 운동 안내 사진을 고르는 데 쓴다. */}
      <fieldset className="flex flex-col gap-2">
        <legend className="sf-h2 mb-2">성별</legend>
        <div role="radiogroup" aria-label="성별" className="grid grid-cols-2 gap-2">
          {GENDERS.map((gender) => (
            <button
              key={gender}
              type="button"
              role="radio"
              aria-checked={values.gender === gender}
              onClick={() => update({ gender })}
              className="sf-chip px-2"
            >
              {GENDER_LABELS[gender]}
            </button>
          ))}
        </div>
        <FieldError id="gender-error" message={errors.gender} />
      </fieldset>

      {/* 부상·불편한 부위: 여러 개 고르기 ("없음"은 다른 부위와 함께 고를 수 없다) */}
      <fieldset className="flex flex-col gap-2">
        <legend className="sf-h2 mb-2">아픈 곳이 있나요?</legend>
        <div className="flex flex-wrap gap-2">
          <ToggleChip label="없음" pressed={values.noInjury} onClick={toggleNoInjury} />
          {INJURY_PARTS.map((part) => (
            <ToggleChip
              key={part}
              label={INJURY_LABELS[part]}
              pressed={values.injuries.includes(part)}
              onClick={() => toggleInjury(part)}
            />
          ))}
        </div>
        <FieldError id="injuries-error" message={errors.injuries} />

        {hasOther && (
          <>
            <input
              id="injury-other"
              type="text"
              value={values.injuryOther}
              onChange={(event) => update({ injuryOther: event.target.value })}
              maxLength={INJURY_OTHER_MAX_LENGTH}
              placeholder="기타 부위 (예: 고관절)"
              aria-label="기타 부위"
              aria-invalid={errors.injuryOther ? true : undefined}
              aria-describedby={errors.injuryOther ? "injury-other-error" : undefined}
              className="sf-input"
            />
            <FieldError id="injury-other-error" message={errors.injuryOther} />
          </>
        )}
      </fieldset>

      {/* 키·체중: 관절 부담(BMI)을 계산하는 데 쓴다. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label htmlFor="height" className="sf-h2">
            키
          </label>
          <div className="flex items-center gap-2">
            <input
              id="height"
              type="text"
              inputMode="decimal"
              value={values.height}
              onChange={(event) => update({ height: event.target.value })}
              placeholder={`예: 170`}
              aria-invalid={errors.height ? true : undefined}
              aria-describedby={errors.height ? "height-error" : undefined}
              className="sf-input"
            />
            <span className="text-sm">cm</span>
          </div>
          <FieldError id="height-error" message={errors.height} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="weight" className="sf-h2">
            체중
          </label>
          <div className="flex items-center gap-2">
            <input
              id="weight"
              type="text"
              inputMode="decimal"
              value={values.weight}
              onChange={(event) => update({ weight: event.target.value })}
              placeholder="예: 70"
              aria-invalid={errors.weight ? true : undefined}
              aria-describedby={errors.weight ? "weight-error" : undefined}
              className="sf-input"
            />
            <span className="text-sm">kg</span>
          </div>
          <FieldError id="weight-error" message={errors.weight} />
        </div>
      </div>

      {saveFailed && (
        <p role="alert" className="sf-error">
          이 브라우저에서는 몸 정보를 저장할 수 없어요. 시크릿 모드나 저장 차단 설정을 끄고 다시 시도해 주세요.
        </p>
      )}

      <button type="submit" className="sf-btn">
        저장
      </button>
      <p className="text-center text-xs leading-relaxed text-foreground/60">
        이 브라우저에만 저장돼요. 브라우저 데이터를 지우거나 기기를 바꾸면 다시 입력해야 합니다.
      </p>
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
      className="sf-chip"
    >
      {label}
    </button>
  );
}

/** 입력 오류 문구 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="sf-error">
      {message}
    </p>
  );
}
