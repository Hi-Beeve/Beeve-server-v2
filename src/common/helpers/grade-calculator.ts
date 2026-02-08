import { PrismaService } from '../../prisma/prisma.service';

export interface GradeResult {
  grade: number;
  value: number;
  rawValue?: number;
  program: string;
}

/**
 * 체력 등급 계산기
 */
export class GradeCalculator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 근력 등급 계산
   */
  async calculateStrengthGrade(
    pushUpReps: number,
    pushUpType: 'WALL' | 'KNEE' | 'STANDARD',
    gender: string,
    ageMin: number,
    ageMax: number,
  ): Promise<GradeResult> {
    const weights = { WALL: 0.5, KNEE: 0.7, STANDARD: 1.0 };
    const weightedValue = pushUpReps * weights[pushUpType];

    const standards = await this.prisma.rank_standard.findMany({
      where: {
        gender,
        age_min: { lte: ageMax },
        age_max: { gte: ageMin },
      },
      orderBy: { grade: 'asc' },
    });

    let grade = 4;
    for (const standard of standards) {
      if (weightedValue >= Number(standard.push_up_reps) * weights[pushUpType]) {
        grade = standard.grade;
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
  async calculateCardioGrade(
    vo2max: number,
    recoveryBpm: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): Promise<GradeResult> {
    const standards = await this.prisma.rank_standard.findMany({
      where: {
        gender,
        age_min: { lte: ageMax },
        age_max: { gte: ageMin },
      },
      orderBy: { grade: 'asc' },
    });

    let grade = 4;
    for (const standard of standards) {
      if (vo2max >= Number(standard.step_test_vo2max)) {
        grade = standard.grade;
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
  async calculateEnduranceGrade(
    crossCrunchReps: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): Promise<GradeResult> {
    const standards = await this.prisma.rank_standard.findMany({
      where: {
        gender,
        age_min: { lte: ageMax },
        age_max: { gte: ageMin },
      },
      orderBy: { grade: 'asc' },
    });

    let grade = 4;
    for (const standard of standards) {
      if (crossCrunchReps >= standard.cross_crunch_reps) {
        grade = standard.grade;
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
  async calculateFlexibilityGrade(
    sitAndReach: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): Promise<GradeResult> {
    const standards = await this.prisma.rank_standard.findMany({
      where: {
        gender,
        age_min: { lte: ageMax },
        age_max: { gte: ageMin },
      },
      orderBy: { grade: 'asc' },
    });

    let grade = 4;
    for (const standard of standards) {
      if (sitAndReach >= Number(standard.sit_and_reach)) {
        grade = standard.grade;
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
   */
  async calculateAgilityGrade(
    reactionTime: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): Promise<GradeResult> {
    const standards = await this.prisma.rank_standard.findMany({
      where: {
        gender,
        age_min: { lte: ageMax },
        age_max: { gte: ageMin },
      },
      orderBy: { grade: 'asc' },
    });

    let grade = 4;
    for (const standard of standards) {
      if (standard.reaction_time && reactionTime <= Number(standard.reaction_time)) {
        grade = standard.grade;
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
   */
  async calculateQuicknessGrade(
    flightTime: number,
    gender: string,
    ageMin: number,
    ageMax: number,
  ): Promise<GradeResult> {
    const standards = await this.prisma.rank_standard.findMany({
      where: {
        gender,
        age_min: { lte: ageMax },
        age_max: { gte: ageMin },
      },
      orderBy: { grade: 'asc' },
    });

    let grade = 4;
    for (const standard of standards) {
      if (standard.flight_time && flightTime >= Number(standard.flight_time)) {
        grade = standard.grade;
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
