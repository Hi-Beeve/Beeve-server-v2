import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateAge, getAgeRange } from '../common/helpers/age-range.helper';
import { GradeCalculator } from '../common/helpers/grade-calculator';

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

    // 3. 동성별 + 동연령대 공공 데이터 조회
    const publicData = await this.prisma.public_fitness_rank.findMany({
      where: {
        gender: member.gender,
        age_min: ageRange.min,
        age_max: ageRange.max,
      },
    });

    // 4. 동성별 + 동연령대 회원 데이터 조회 (member_id별 최신 1건, 본인 제외)
    const memberData = await this.getOtherMemberLatestMeasures(
      memberId,
      member.gender,
      ageRange,
    );

    // 5. 내 등급 추출
    const myResult = latestMeasure.fitness_result as any;
    const myGrades = {
      cardio: myResult.CARDIO?.grade,
      endurance: myResult.ENDURANCE?.grade,
      flexibility: myResult.FLEXIBILITY?.grade,
      quickness: myResult.QUICKNESS?.grade,
      agility: myResult.AGILITY?.grade,
    };
    const myStrengthGrade = myResult.STRENGTH?.grade;

    // 6. 합산 비교 데이터 생성 (공공 데이터 + 회원 데이터의 평균 등급 배열)
    const combinedAvgGrades: number[] = [];
    for (const person of publicData) {
      combinedAvgGrades.push(this.calculatePublicAvgGrade(person));
    }
    for (const m of memberData) {
      const result = m.fitness_result as any;
      combinedAvgGrades.push(
        this.calculateAvgGrade({
          cardio: result.CARDIO?.grade,
          endurance: result.ENDURANCE?.grade,
          flexibility: result.FLEXIBILITY?.grade,
          quickness: result.QUICKNESS?.grade,
          agility: result.AGILITY?.grade,
        }),
      );
    }

    const totalRecords = combinedAvgGrades.length;

    if (totalRecords === 0) {
      return {
        isSuccess: true,
        data: null,
      };
    }

    // 7. 종합 순위 계산 (평균 등급 기준, 등급 낮을수록 좋음)
    const myAvgGrade = this.calculateAvgGrade(myGrades);
    let totalRank = 1;
    for (const avgGrade of combinedAvgGrades) {
      if (avgGrade < myAvgGrade) {
        totalRank++;
      }
    }

    // 8. 각 체력 항목별 순위 (합산 데이터 기반)
    const fitnessRankList = this.calculateFitnessRanks(
      myGrades,
      myStrengthGrade,
      publicData,
      memberData,
    );

    // 9. 순위 히스토리 (사용자의 측정 기록 기반)
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
      const grades = {
        cardio: result.CARDIO?.grade,
        endurance: result.ENDURANCE?.grade,
        flexibility: result.FLEXIBILITY?.grade,
        quickness: result.QUICKNESS?.grade,
        agility: result.AGILITY?.grade,
      };
      const avgGrade = this.calculateAvgGrade(grades);

      let rank = 1;
      for (const compAvg of combinedAvgGrades) {
        if (compAvg < avgGrade) {
          rank++;
        }
      }

      return {
        rank,
        percentile: this.calculatePercentile(rank, totalRecords),
        date: measure.measure_day.toISOString().split('T')[0],
      };
    });

    return {
      isSuccess: true,
      data: {
        currentRank: {
          rank: totalRank,
          totalRecords,
          percentile: this.calculatePercentile(totalRank, totalRecords),
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
   * 동성별 + 동연령대 다른 회원의 최신 측정 기록 조회 (member_id별 최신 1건)
   */
  private async getOtherMemberLatestMeasures(
    excludeMemberId: bigint,
    gender: string,
    ageRange: { min: number; max: number },
  ) {
    const measures = await this.prisma.fitness_measure.findMany({
      where: {
        gender,
        deleted_yn: 'N',
        NOT: { member_id: excludeMemberId },
        age_range: {
          equals: { min: ageRange.min, max: ageRange.max },
        },
      },
      orderBy: {
        measure_day: 'desc',
      },
    });

    // member_id별 최신 1건만 추출
    const latestByMember = new Map<bigint, (typeof measures)[0]>();
    for (const m of measures) {
      if (m.member_id && !latestByMember.has(m.member_id)) {
        latestByMember.set(m.member_id, m);
      }
    }

    return Array.from(latestByMember.values());
  }

  /**
   * 퍼센타일 계산 (높을수록 좋음)
   */
  private calculatePercentile(rank: number, totalRecords: number): number {
    if (totalRecords === 0) return 0;
    return Math.round(100 - (rank / totalRecords) * 100);
  }

  /**
   * 사용자 등급의 평균 계산 (public_fitness_rank에 없는 STRENGTH 제외)
   */
  private calculateAvgGrade(grades: {
    cardio?: number;
    endurance?: number;
    flexibility?: number;
    quickness?: number;
    agility?: number;
  }): number {
    const values = [
      grades.cardio,
      grades.endurance,
      grades.flexibility,
      grades.quickness,
      grades.agility,
    ].filter((v) => v !== undefined && v !== null) as number[];

    if (values.length === 0) return 4;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 공공 데이터 레코드의 평균 등급 계산
   */
  private calculatePublicAvgGrade(person: any): number {
    const values = [
      person.cardio_grade,
      person.endurance_grade,
      person.flexibility_grade,
      person.quickness_grade,
      person.agility_grade,
    ].filter((v) => v !== undefined && v !== null) as number[];

    if (values.length === 0) return 4;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 각 체력 항목별 순위 계산 (공공 + 회원 합산 데이터 기반)
   */
  private calculateFitnessRanks(
    myGrades: {
      cardio?: number;
      endurance?: number;
      flexibility?: number;
      quickness?: number;
      agility?: number;
    },
    myStrengthGrade: number | undefined,
    publicData: any[],
    memberData: any[],
  ) {
    // 5개 항목: 공공 + 회원 합산
    const fitnessTypes = [
      { type: 'CARDIO', myGrade: myGrades.cardio, publicField: 'cardio_grade', resultKey: 'CARDIO' },
      { type: 'ENDURANCE', myGrade: myGrades.endurance, publicField: 'endurance_grade', resultKey: 'ENDURANCE' },
      { type: 'FLEXIBILITY', myGrade: myGrades.flexibility, publicField: 'flexibility_grade', resultKey: 'FLEXIBILITY' },
      { type: 'QUICKNESS', myGrade: myGrades.quickness, publicField: 'quickness_grade', resultKey: 'QUICKNESS' },
      { type: 'AGILITY', myGrade: myGrades.agility, publicField: 'agility_grade', resultKey: 'AGILITY' },
    ];

    const result = fitnessTypes
      .filter((ft) => ft.myGrade !== undefined && ft.myGrade !== null)
      .map((ft) => {
        // 공공 데이터에서 해당 항목 등급 수집
        const compGrades: number[] = [];
        for (const person of publicData) {
          if (person[ft.publicField] !== null && person[ft.publicField] !== undefined) {
            compGrades.push(person[ft.publicField]);
          }
        }
        // 회원 데이터에서 해당 항목 등급 수집
        for (const m of memberData) {
          const r = m.fitness_result as any;
          const grade = r[ft.resultKey]?.grade;
          if (grade !== undefined && grade !== null) {
            compGrades.push(grade);
          }
        }

        let rank = 1;
        for (const g of compGrades) {
          if (g < ft.myGrade!) {
            rank++;
          }
        }

        const totalRecords = compGrades.length;
        return {
          type: ft.type,
          rank,
          totalRecords,
          percentile: this.calculatePercentile(rank, totalRecords),
        };
      });

    // STRENGTH: 회원 데이터만 사용 (공공 데이터에 없음)
    if (myStrengthGrade !== undefined && myStrengthGrade !== null) {
      const strengthGrades: number[] = [];
      for (const m of memberData) {
        const r = m.fitness_result as any;
        const grade = r.STRENGTH?.grade;
        if (grade !== undefined && grade !== null) {
          strengthGrades.push(grade);
        }
      }

      let strengthRank = 1;
      for (const g of strengthGrades) {
        if (g < myStrengthGrade) {
          strengthRank++;
        }
      }

      const strengthTotalRecords = strengthGrades.length;
      result.push({
        type: 'STRENGTH',
        rank: strengthRank,
        totalRecords: strengthTotalRecords,
        percentile: this.calculatePercentile(strengthRank, strengthTotalRecords),
      });
    }

    return result;
  }
}
