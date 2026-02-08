/**
 * 생년월일로부터 나이 계산
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * 나이로부터 연령대 범위 반환 (국민체력100 평가표 기준 5세 단위)
 */
export function getAgeRange(age: number): { min: number; max: number } {
  if (age < 19) return { min: 0, max: 18 };
  if (age <= 24) return { min: 19, max: 24 }; // 첫 연령대: 19-24세 (6년)
  if (age <= 29) return { min: 25, max: 29 };
  if (age <= 34) return { min: 30, max: 34 };
  if (age <= 39) return { min: 35, max: 39 };
  if (age <= 44) return { min: 40, max: 44 };
  if (age <= 49) return { min: 45, max: 49 };
  if (age <= 54) return { min: 50, max: 54 };
  if (age <= 59) return { min: 55, max: 59 };
  if (age <= 64) return { min: 60, max: 64 };
  return { min: 65, max: 100 }; // 65세 이상
}
