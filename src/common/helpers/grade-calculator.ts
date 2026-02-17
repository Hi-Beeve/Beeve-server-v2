import { getStandard } from '../config/program-standard.config';

export interface GradeResult {
  grade: number;
  value: number;
  rawValue?: number;
  program: string;
}

/**
 * 체력 등급 계산기 (로컬 config 기반)
 */
export class GradeCalculator {
  /**
   * 근력 등급 계산
   */
  calculateStrengthGrade(
    pushUpReps: number,
    pushUpType: 'WALL' | 'KNEE' | 'STANDARD',
    gender: string,
    ageMin: number,
    ageMax: number,
  ): GradeResult {
    const weights = { WALL: 0.5, KNEE: 0.7, STANDARD: 1.0 };
    const weightedValue = pushUpReps * weights[pushUpType];

    let grade = 4;
    for (const g of [1, 2, 3]) {
      const standard = getStandard(g, gender, ageMin, ageMax);
      if (standard && weightedValue >= standard.STRENGTH * weights[pushUpType]) {
        grade = g;
        break;
      }
    }

    return {
      grade,
      value: parseFloat(weightedValue.toFixed(2)),
      rawValue: pushUpReps,
      program: `${pushUpType}_PUSH_UP`,
    };
  }

  /**
   * 심폐지구력 등급 계산
   */
  calculateCardioGrade(
    vo2max: number,
    recoveryBpm: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): GradeResult {
    let grade = 4;
    for (const g of [1, 2, 3]) {
      const standard = getStandard(g, gender, ageMin, ageMax);
      if (standard && vo2max >= standard.CARDIO) {
        grade = g;
        break;
      }
    }

    return {
      grade,
      value: parseFloat(vo2max.toFixed(2)),
      rawValue: recoveryBpm,
      program: 'VO2MAX',
    };
  }

  /**
   * 근지구력 등급 계산
   */
  calculateEnduranceGrade(
    crossCrunchReps: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): GradeResult {
    let grade = 4;
    for (const g of [1, 2, 3]) {
      const standard = getStandard(g, gender, ageMin, ageMax);
      if (standard && crossCrunchReps >= standard.ENDURANCE) {
        grade = g;
        break;
      }
    }

    return {
      grade,
      value: crossCrunchReps,
      program: 'CROSS_CRUNCH',
    };
  }

  /**
   * 유연성 등급 계산
   */
  calculateFlexibilityGrade(
    sitAndReach: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): GradeResult {
    let grade = 4;
    for (const g of [1, 2, 3]) {
      const standard = getStandard(g, gender, ageMin, ageMax);
      if (standard && sitAndReach >= standard.FLEXIBILITY) {
        grade = g;
        break;
      }
    }

    return {
      grade,
      value: sitAndReach,
      program: 'SIT_AND_REACH',
    };
  }

  /**
   * 민첩성 등급 계산 (반응시간 - 낮을수록 좋음)
   * 3등급에 AGILITY 기준값 없음 → 2등급 미달 시 4등급
   */
  calculateAgilityGrade(
    reactionTime: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): GradeResult {
    let grade = 4;
    for (const g of [1, 2, 3]) {
      const standard = getStandard(g, gender, ageMin, ageMax);
      if (standard?.AGILITY != null && reactionTime <= standard.AGILITY) {
        grade = g;
        break;
      }
    }

    return {
      grade,
      value: reactionTime,
      program: 'REACTION_TIME',
    };
  }

  /**
   * 순발력 등급 계산 (체공시간 - 높을수록 좋음)
   * 3등급에 QUICKNESS 기준값 없음 → 2등급 미달 시 4등급
   */
  calculateQuicknessGrade(
    flightTime: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): GradeResult {
    let grade = 4;
    for (const g of [1, 2, 3]) {
      const standard = getStandard(g, gender, ageMin, ageMax);
      if (standard?.QUICKNESS != null && flightTime >= standard.QUICKNESS) {
        grade = g;
        break;
      }
    }

    return {
      grade,
      value: flightTime,
      program: 'FLIGHT_TIME',
    };
  }

  /**
   * 종합 등급 계산
   */
  calculateTotalGrade(grades: number[]): number {
    if (grades.length === 0) return 4;
    const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
    return Math.round(avg);
  }
}
