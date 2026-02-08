/**
 * VO2MAX 계산 (조선대학교 연구 기반 공식)
 * Step Test 회복기 심박수를 기반으로 VO2MAX 추정
 */
export function calculateVO2MAX(
  recoveryBpm: number,
  age: number,
  gender: string,
): number {
  // 조선대학교 연구 기반 공식
  // 남성: VO2MAX = 111.33 - (0.42 × HR)
  // 여성: VO2MAX = 65.81 - (0.1847 × HR)

  let vo2max: number;

  if (gender === 'M') {
    vo2max = 111.33 - 0.42 * recoveryBpm;
  } else {
    vo2max = 65.81 - 0.1847 * recoveryBpm;
  }

  // 나이 보정 (선택적)
  // 나이가 많을수록 약간 감소
  const ageCorrection = (age - 25) * 0.1;
  vo2max = vo2max - ageCorrection;

  // 최소값 보정 (음수 방지)
  return Math.max(vo2max, 10);
}

/**
 * 근력 가중값 계산
 * 푸시업 종류에 따른 가중치 적용
 */
export function calculateStrengthValue(
  reps: number,
  pushUpType: 'WALL' | 'KNEE' | 'STANDARD',
): number {
  const weights = {
    WALL: 0.5,
    KNEE: 0.7,
    STANDARD: 1.0,
  };

  return reps * weights[pushUpType];
}
