import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateAge, getAgeRange } from '../common/helpers/age-range.helper';
import { GradeCalculator } from '../common/helpers/grade-calculator';

@Injectable()
export class RankService {
  private gradeCalculator: GradeCalculator;

  constructor(private readonly prisma: PrismaService) {
    this.gradeCalculator = new GradeCalculator(prisma);
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

    // 2. 사용자의 측정 기록 조회
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

    if (!myMeasures || myMeasures.length === 0) {
      throw new NotFoundException({
        isSuccess: false,
        code: 'RANK301',
        message: '순위 계산을 위한 충분한 데이터가 없습니다.',
      });
    }

    // 3. 동년배 전체 데이터 조회
    const allMeasures = await this.prisma.fitness_measure.findMany({
      where: {
        gender: member.gender,
        age: {
          gte: ageRange.min,
          lte: ageRange.max,
        },
        deleted_yn: 'N',
      },
    });

    const totalPeople = new Set(allMeasures.map((m) => m.member_id)).size;

    // 4. 현재 순위 계산
    const latestMeasure = myMeasures[0];
    const currentRank = this.calculateCurrentRank(
      latestMeasure,
      allMeasures,
      memberId,
    );

    // 5. 순위 히스토리 계산
    const rankHistoryList = myMeasures.map((measure) => ({
      rank: this.calculateCurrentRank(measure, allMeasures, memberId),
      date: measure.measure_day.toISOString().split('T')[0],
    }));

    // 6. 각 체력 항목별 순위
    const fitnessRankList = this.calculateFitnessRanks(
      latestMeasure,
      allMeasures,
      memberId,
      totalPeople,
    );

    return {
      isSuccess: true,
      data: {
        currentRank: {
          rank: currentRank,
          totalPeople,
          percentile: Math.round((currentRank / totalPeople) * 100),
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
        enduranceGradeList.push({ grade: fitnessResult.ENDURANCE.grade, date });
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
        quicknessGradeList.push({ grade: fitnessResult.QUICKNESS.grade, date });
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
   * 현재 순위 계산 (Helper)
   */
  private calculateCurrentRank(
    myMeasure: any,
    allMeasures: any[],
    memberId: bigint,
  ): number {
    const myResult = myMeasure.fitness_result as any;
    const myGrades = Object.values(myResult).map((data: any) => data.grade);
    const myAvgGrade = myGrades.reduce((a, b) => a + b, 0) / myGrades.length;

    let rank = 1;
    const processedUsers = new Set<bigint>();

    for (const measure of allMeasures) {
      if (
        measure.member_id === memberId ||
        processedUsers.has(measure.member_id)
      ) {
        continue;
      }

      const result = measure.fitness_result as any;
      const grades = Object.values(result).map((data: any) => data.grade);
      const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;

      if (avgGrade < myAvgGrade) {
        rank++;
      }

      processedUsers.add(measure.member_id);
    }

    return rank;
  }

  /**
   * 각 체력 항목별 순위 계산
   */
  private calculateFitnessRanks(
    myMeasure: any,
    allMeasures: any[],
    memberId: bigint,
    totalPeople: number,
  ) {
    const myResult = myMeasure.fitness_result as any;
    const fitnessRankList = [];

    for (const [type, myData] of Object.entries(myResult)) {
      let rank = 1;
      const processedUsers = new Set<bigint>();

      for (const measure of allMeasures) {
        if (
          measure.member_id === memberId ||
          processedUsers.has(measure.member_id)
        ) {
          continue;
        }

        const result = measure.fitness_result as any;
        if (result[type] && result[type].grade < (myData as any).grade) {
          rank++;
        }

        processedUsers.add(measure.member_id);
      }

      fitnessRankList.push({
        type,
        rank,
        percentile: Math.round((rank / totalPeople) * 100),
      });
    }

    return fitnessRankList;
  }
}
