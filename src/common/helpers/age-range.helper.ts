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
 * 나이로부터 연령대 범위 반환
 */
export function getAgeRange(age: number): { min: number; max: number } {
  if (age < 20) return { min: 0, max: 19 };
  if (age < 30) return { min: 20, max: 29 };
  if (age < 40) return { min: 30, max: 39 };
  if (age < 50) return { min: 40, max: 49 };
  if (age < 60) return { min: 50, max: 59 };
  if (age < 70) return { min: 60, max: 69 };
  return { min: 70, max: 100 };
}
