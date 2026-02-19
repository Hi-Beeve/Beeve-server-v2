import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateAge, getAgeRange } from '../common/helpers/age-range.helper';
import { GradeCalculator } from '../common/helpers/grade-calculator';

// 낮을수록 좋은 항목 (반응시간)
const LOWER_IS_BETTER = new Set(['AGILITY']);

@Injectable()
export class RankService {
  private gradeCalculator: GradeCalculator;

  constructor(private readonly prisma: PrismaService) {
    this.gradeCalculator = new GradeCalculator();
  }

  /**
   * 연령대 순위 조회
   */
  async getAgeGroupRank(memberId: bigint) {
    // 1. 사용자 정보 조회
    const member = await this.prisma.member.findUnique({
      where: { member_id: memberId },
    });

    if (!member) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const age = calculateAge(member.birth_date!);
    const ageRange = getAgeRange(age);

    // 2. 사용자의 최신 측정 기록 조회
    const latestMeasure = await this.prisma.fitness_measure.findFirst({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      orderBy: {
        measure_day: 'desc',
      },
    });

    if (!latestMeasure) {
      return {
        isSuccess: true,
        data: null,
      };
    }

    // 3. 백분위 기준표 조회 (해당 성별 + 연령대 전체)
    const percentileStandards =
      await this.prisma.fitness_percentile_standard.findMany({
        where: {
          gender: member.gender,
          min_age: ageRange.min,
          max_age: ageRange.max,
        },
        orderBy: { percentile_rank: 'desc' },
      });

    if (percentileStandards.length === 0) {
      return {
        isSuccess: true,
        data: null,
      };
    }

    // 4. 내 측정값 추출 및 항목별 백분위 계산
    const myResult = latestMeasure.fitness_result as any;
    const fitnessRankList = this.calculateFitnessPercentiles(
      myResult,
      percentileStandards,
    );

    // 5. 종합 백분위 (항목별 백분위 평균)
    const currentPercentile = this.calculateOverallPercentile(fitnessRankList);

    // 6. 순위 히스토리
    const myMeasures = await this.prisma.fitness_measure.findMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      orderBy: {
        measure_day: 'desc',
      },
      take: 10,
    });

    const rankHistoryList = myMeasures.map((measure) => {
      const result = measure.fitness_result as any;
      const fitnessList = this.calculateFitnessPercentiles(
        result,
        percentileStandards,
      );
      return {
        percentile: this.calculateOverallPercentile(fitnessList),
        date: measure.measure_day.toISOString().split('T')[0],
      };
    });

    return {
      isSuccess: true,
      data: {
        currentRank: {
          percentile: currentPercentile,
        },
        rankHistoryList,
        fitnessRankList,
      },
    };
  }

  /**
   * 체력 등급 상세 히스토리
   */
  async getGradeHistory(memberId: bigint) {
    const measures = await this.prisma.fitness_measure.findMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      orderBy: {
        measure_day: 'desc',
      },
    });

    // 각 체력 항목별로 그룹화
    const totalGradeList: { grade: number; date: string }[] = [];
    const strengthGradeList: { grade: number; date: string }[] = [];
    const cardioGradeList: { grade: number; date: string }[] = [];
    const enduranceGradeList: { grade: number; date: string }[] = [];
    const flexibilityGradeList: { grade: number; date: string }[] = [];
    const agilityGradeList: { grade: number; date: string }[] = [];
    const quicknessGradeList: { grade: number; date: string }[] = [];

    // 데이터가 없으면 빈 배열 반환
    if (!measures || measures.length === 0) {
      return {
        totalGradeList,
        strengthGradeList,
        cardioGradeList,
        enduranceGradeList,
        flexibilityGradeList,
        agilityGradeList,
        quicknessGradeList,
      };
    }

    for (const measure of measures) {
      const date = measure.measure_day.toISOString().split('T')[0];
      const fitnessResult = measure.fitness_result as any;

      // 종합 등급
      const grades = Object.values(fitnessResult).map(
        (data: any) => data.grade,
      );
      const totalGrade = this.gradeCalculator.calculateTotalGrade(grades);
      totalGradeList.push({ grade: totalGrade, date });

      // 각 항목별 등급
      if (fitnessResult.STRENGTH) {
        strengthGradeList.push({ grade: fitnessResult.STRENGTH.grade, date });
      }
      if (fitnessResult.CARDIO) {
        cardioGradeList.push({ grade: fitnessResult.CARDIO.grade, date });
      }
      if (fitnessResult.ENDURANCE) {
        enduranceGradeList.push({
          grade: fitnessResult.ENDURANCE.grade,
          date,
        });
      }
      if (fitnessResult.FLEXIBILITY) {
        flexibilityGradeList.push({
          grade: fitnessResult.FLEXIBILITY.grade,
          date,
        });
      }
      if (fitnessResult.AGILITY) {
        agilityGradeList.push({ grade: fitnessResult.AGILITY.grade, date });
      }
      if (fitnessResult.QUICKNESS) {
        quicknessGradeList.push({
          grade: fitnessResult.QUICKNESS.grade,
          date,
        });
      }
    }

    return {
      totalGradeList,
      strengthGradeList,
      cardioGradeList,
      enduranceGradeList,
      flexibilityGradeList,
      agilityGradeList,
      quicknessGradeList,
    };
  }

  /**
   * 백분위 기준표에서 사용자 측정값의 백분위 조회
   * - 높을수록 좋은 항목: max percentile_rank WHERE threshold_value <= value
   * - 낮을수록 좋은 항목(AGILITY): 100 - (위 결과)
   */
  private lookupPercentile(
    fitness: string,
    value: number,
    standards: any[],
  ): number | null {
    const filtered = standards.filter((s) => s.fitness === fitness);
    if (filtered.length === 0) return null;

    // standards는 이미 percentile_rank DESC로 정렬되어 있음
    const match = filtered.find(
      (s) => Number(s.threshold_value) <= value,
    );

    const rawPercentile = match?.percentile_rank ?? 0;

    if (LOWER_IS_BETTER.has(fitness)) {
      return 100 - rawPercentile;
    }

    return rawPercentile;
  }

  /**
   * 각 체력 항목별 백분위 계산
   */
  private calculateFitnessPercentiles(
    fitnessResult: any,
    standards: any[],
  ): { type: string; percentile: number }[] {
    const fitnessTypes = ['CARDIO', 'ENDURANCE', 'FLEXIBILITY', 'QUICKNESS', 'AGILITY'];
    const result: { type: string; percentile: number }[] = [];

    for (const type of fitnessTypes) {
      const data = fitnessResult[type];
      if (!data || data.value === undefined || data.value === null) continue;

      const percentile = this.lookupPercentile(type, data.value, standards);
      if (percentile !== null) {
        result.push({ type, percentile });
      }
    }

    return result;
  }

  /**
   * 종합 백분위 계산 (항목별 백분위 평균)
   */
  private calculateOverallPercentile(
    fitnessRankList: { type: string; percentile: number }[],
  ): number {
    if (fitnessRankList.length === 0) return 0;
    const sum = fitnessRankList.reduce((acc, f) => acc + f.percentile, 0);
    return Math.round(sum / fitnessRankList.length);
  }
}
