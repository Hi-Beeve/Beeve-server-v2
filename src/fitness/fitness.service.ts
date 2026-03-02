import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFitnessMeasureDto } from './dto/create-fitness-measure.dto';
import {
  CreateExerciseInfoDto,
  HealthIssueType,
} from './dto/create-exercise-info.dto';
import {
  calculateAge,
  getAgeRange,
} from '../common/helpers/age-range.helper';
import { calculateVO2MAX } from '../common/helpers/vo2max-calculator';
import { GradeCalculator } from '../common/helpers/grade-calculator';

@Injectable()
export class FitnessService {
  private gradeCalculator: GradeCalculator;

  constructor(private readonly prisma: PrismaService) {
    this.gradeCalculator = new GradeCalculator();
  }

  /**
   * 운동 정보 조회
   */
  async getExerciseInfo(memberId: bigint) {
    const exerciseInfo =
      await this.prisma.user_exercise_information.findFirst({
        where: {
          member_id: memberId,
          deleted_yn: 'N',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

    if (!exerciseInfo) {
      return {
        isSuccess: true,
        data: null,
      };
    }

    return {
      isSuccess: true,
      data: {
        exerciseInfoId: Number(exerciseInfo.exercise_info_id),
        goal: exerciseInfo.goal,
        place: exerciseInfo.place,
        equipment: JSON.parse(exerciseInfo.equipment || '[]'),
        disease: exerciseInfo.disease,
        injury: exerciseInfo.injury,
      },
    };
  }

  /**
   * 운동 정보 등록
   */
  async createExerciseInfo(memberId: bigint, dto: CreateExerciseInfoDto) {
    // 기존 운동 정보 논리 삭제
    await this.prisma.user_exercise_information.updateMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      data: {
        deleted_yn: 'Y',
      },
    });

    const exerciseInfo = await this.prisma.user_exercise_information.create({
      data: {
        member_id: memberId,
        goal: dto.goal,
        place: dto.place,
        equipment: JSON.stringify(dto.equipment),
        disease:
          dto.healthIssueType === HealthIssueType.DISEASE
            ? dto.healthIssueText
            : null,
        injury:
          dto.healthIssueType === HealthIssueType.INJURY
            ? dto.healthIssueText
            : null,
      },
    });

    return {
      isSuccess: true,
      data: {
        exerciseInfoId: Number(exerciseInfo.exercise_info_id),
        goal: exerciseInfo.goal,
        place: exerciseInfo.place,
        equipment: JSON.parse(exerciseInfo.equipment || '[]'),
        disease: exerciseInfo.disease,
        injury: exerciseInfo.injury,
      },
    };
  }

  /**
   * 체력 측정 결과 등록
   */
  async createFitnessMeasure(memberId: bigint, dto: CreateFitnessMeasureDto) {
    // 1. 사용자 정보 조회
    const member = await this.prisma.member.findUnique({
      where: { member_id: memberId },
    });

    if (!member) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 2. 사용자 정보 완전성 체크
    if (!member.birth_date || !member.height || !member.weight) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'FITNESS305',
        message: '사용자 정보(생년월일, 신장, 체중)가 완전하지 않습니다.',
      });
    }

    // 3. 근력 측정 필드 검증 (정확히 하나만)
    const pushUpFields = [
      dto.wallPushUpReps,
      dto.kneePushUpReps,
      dto.standardPushUpReps,
    ].filter((v) => v !== undefined && v !== null);

    if (pushUpFields.length !== 1) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'FITNESS304',
        message:
          '근력 측정 시 wallPushUpReps, kneePushUpReps, standardPushUpReps 중 정확히 하나만 입력해야 합니다.',
      });
    }

    // 4. 하루 1회 제한 체크 (한국 시간 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // UTC+9
    const kstDate = new Date(now.getTime() + kstOffset);
    const today = new Date(
      Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate())
    );

    const existingMeasure = await this.prisma.fitness_measure.findFirst({
      where: {
        member_id: memberId,
        measure_day: today,
        deleted_yn: 'N',
      },
    });

    if (existingMeasure) {
      throw new ConflictException({
        isSuccess: false,
        code: 'FITNESS301',
        message: '체력 측정은 하루에 1번만 가능합니다.',
      });
    }

    // 5. 나이 및 연령대 계산
    const age = calculateAge(member.birth_date);
    const ageRange = getAgeRange(age);

    // 6. 푸시업 타입 및 횟수 결정
    let pushUpType: 'WALL' | 'KNEE' | 'STANDARD';
    let pushUpReps: number;

    if (dto.wallPushUpReps !== undefined) {
      pushUpType = 'WALL';
      pushUpReps = dto.wallPushUpReps;
    } else if (dto.kneePushUpReps !== undefined) {
      pushUpType = 'KNEE';
      pushUpReps = dto.kneePushUpReps;
    } else {
      pushUpType = 'STANDARD';
      pushUpReps = dto.standardPushUpReps!;
    }

    // 7. VO2MAX 계산
    const vo2max = calculateVO2MAX(
      dto.stepTestRecoveryBpm,
      age,
      member.gender,
    );

    // 8. 각 체력 항목별 등급 계산
    const strengthResult = this.gradeCalculator.calculateStrengthGrade(
      pushUpReps,
      pushUpType,
      member.gender,
      ageRange.min,
      ageRange.max,
    );

    const cardioResult = this.gradeCalculator.calculateCardioGrade(
      vo2max,
      dto.stepTestRecoveryBpm,
      member.gender,
      ageRange.min,
      ageRange.max,
    );

    const enduranceResult = this.gradeCalculator.calculateEnduranceGrade(
      dto.crossCrunchReps,
      member.gender,
      ageRange.min,
      ageRange.max,
    );

    const flexibilityResult =
      this.gradeCalculator.calculateFlexibilityGrade(
        dto.sitAndReach,
        member.gender,
        ageRange.min,
        ageRange.max,
      );

    const agilityResult = this.gradeCalculator.calculateAgilityGrade(
      dto.reactionTime,
      member.gender,
      ageRange.min,
      ageRange.max,
    );

    const quicknessResult = this.gradeCalculator.calculateQuicknessGrade(
      dto.flightTime,
      member.gender,
      ageRange.min,
      ageRange.max,
    );

    // 9. fitness_result JSON 생성
    const fitnessResult = {
      STRENGTH: strengthResult,
      CARDIO: cardioResult,
      ENDURANCE: enduranceResult,
      FLEXIBILITY: flexibilityResult,
      AGILITY: agilityResult,
      QUICKNESS: quicknessResult,
    };

    // 10. BMI 계산
    const heightInMeters = Number(member.height) / 100;
    const bmi = Number(member.weight) / (heightInMeters * heightInMeters);

    // 11. DB 저장
    await this.prisma.fitness_measure.create({
      data: {
        member_id: memberId,
        age,
        age_range: ageRange,
        measure_day: today,
        gender: member.gender,
        height: member.height,
        weight: member.weight,
        bmi: parseFloat(bmi.toFixed(2)),
        rpe: dto.rpe,
        measure_place: dto.measurePlace,
        fitness_result: fitnessResult as any,
        deleted_yn: 'N',
      },
    });

    return {
      isSuccess: true,
      data: null,
    };
  }

  /**
   * 측정 날짜 목록 조회
   */
  async getMeasureDays(memberId: bigint) {
    const measures = await this.prisma.fitness_measure.findMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      select: {
        measure_day: true,
      },
      orderBy: {
        measure_day: 'desc',
      },
    });

    const measureDates = measures.map(
      (m) => m.measure_day.toISOString().split('T')[0],
    );

    return { measureDates };
  }

  /**
   * 날짜별 6각형 차트 조회
   */
  async getFitnessChart(memberId: bigint, measureDay?: string) {
    let measure;

    if (measureDay) {
      // 날짜가 제공된 경우 해당 날짜의 기록 조회
      const targetDate = new Date(measureDay);
      if (isNaN(targetDate.getTime())) {
        throw new BadRequestException({
          isSuccess: false,
          code: 'FITNESS306',
          message:
            '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
        });
      }

      measure = await this.prisma.fitness_measure.findFirst({
        where: {
          member_id: memberId,
          measure_day: targetDate,
          deleted_yn: 'N',
        },
      });

      if (!measure) {
        return { isSuccess: true, data: null };
      }
    } else {
      // 날짜가 없는 경우 가장 최근 기록 조회
      measure = await this.prisma.fitness_measure.findFirst({
        where: {
          member_id: memberId,
          deleted_yn: 'N',
        },
        orderBy: {
          measure_day: 'desc',
        },
      });

      if (!measure) {
        // 측정 기록이 전혀 없는 경우 빈 응답
        return { isSuccess: true, data: null };
      }
    }

    // 3. fitness_result JSON 파싱
    const fitnessResult = measure.fitness_result as any;
    const fitness = [];

    for (const [type, data] of Object.entries(fitnessResult)) {
      const item: any = {
        fitnessType: type,
        program: (data as any).program,
        value: (data as any).value,
        grade: (data as any).grade,
      };
      if ((data as any).rawValue !== undefined) {
        item.rawValue = (data as any).rawValue;
      }
      fitness.push(item);
    }

    // 4. 종합 등급 계산
    const grades = fitness.map((f) => f.grade);
    const totalGrade = this.gradeCalculator.calculateTotalGrade(grades);

    // 5. 백분위 계산
    const totalPercentile = await this.calculatePercentile(measure);

    // 실제 측정일 (파라미터로 받은 값이 아닌 DB 값 사용)
    const actualMeasureDay = measure.measure_day.toISOString().split('T')[0];

    return {
      isSuccess: true,
      data: {
        totalGrade,
        totalPercentile,
        measureDay: actualMeasureDay,
        measurePlace: measure.measure_place,
        rpe: measure.rpe,
        height: Number(measure.height),
        weight: Number(measure.weight),
        bmi: Number(measure.bmi),
        age: measure.age,
        gender: measure.gender,
        fitness,
      },
    };
  }

  /**
   * 등급 히스토리 조회 (간단)
   */
  async getGradeHistory(memberId: bigint) {
    const measures = await this.prisma.fitness_measure.findMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      select: {
        measure_day: true,
        fitness_result: true,
      },
      orderBy: {
        measure_day: 'desc',
      },
    });

    if (!measures || measures.length === 0) {
      return {
        isSuccess: true,
        data: { gradeHistory: [] },
      };
    }

    const gradeHistory = measures.map((m) => {
      const fitnessResult = m.fitness_result as any;
      const grades = Object.values(fitnessResult).map(
        (data: any) => data.grade,
      );
      const totalGrade = this.gradeCalculator.calculateTotalGrade(grades);

      return {
        date: m.measure_day.toISOString().split('T')[0],
        grade: totalGrade,
      };
    });

    return {
      isSuccess: true,
      data: { gradeHistory },
    };
  }

  /**
   * 저장된 추천 운동 조회 (날짜별 또는 최신)
   */
  async getRecommendation(memberId: bigint, recommendDate?: string) {
    const recommendation = await this.prisma.daily_recommendation.findFirst({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
        status: 'ACTIVE',
        ...(recommendDate
          ? {
              recommendation_date: {
                gte: new Date(`${recommendDate}T00:00:00.000Z`),
                lt: new Date(`${recommendDate}T23:59:59.999Z`),
              },
            }
          : {}),
      },
      orderBy: {
        recommendation_date: 'desc',
      },
    });

    if (!recommendation) {
      return {
        isSuccess: true,
        message: '추천 운동 조회 성공',
        data: null,
      };
    }

    const aiResponse = JSON.parse(recommendation.ai_response as string);

    return {
      isSuccess: true,
      message: '추천 운동 조회 성공',
      data: {
        recommendationId: Number(recommendation.recommendation_id),
        targetFitnessType: aiResponse.targetFitnessType,
        totalDuration: aiResponse.totalDuration,
        rpe: aiResponse.rpe,
        focus: aiResponse.focus,
        warm_up: aiResponse.warm_up,
        cool_down: aiResponse.cool_down,
        exercises: (aiResponse.exercises || []).map((ex: any) => ({
          exerciseId: ex.exerciseId ?? undefined,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration ?? null,
          rest_seconds: ex.rest_seconds,
          rpe: ex.rpe,
          description: ex.description,
        })),
        notes: aiResponse.notes,
        createdAt: recommendation.recommendation_date.toISOString(),
      },
    };
  }

  /**
   * 백분위 계산 (백분위 기준표 기반)
   */
  private async calculatePercentile(myMeasure: any): Promise<number> {
    const ageRange = myMeasure.age_range as any;
    const LOWER_IS_BETTER = new Set(['AGILITY']);

    // 백분위 기준표 조회
    const standards =
      await this.prisma.fitness_percentile_standard.findMany({
        where: {
          gender: myMeasure.gender === 'male' ? 'M' : 'F',
          min_age: ageRange.min,
          max_age: ageRange.max,
        },
        orderBy: { percentile_rank: 'desc' },
      });

    if (standards.length === 0) return 0;

    // 각 항목별 백분위 계산
    const fitnessResult = myMeasure.fitness_result as any;
    const fitnessTypes = ['CARDIO', 'ENDURANCE', 'FLEXIBILITY', 'QUICKNESS', 'AGILITY'];
    const percentiles: number[] = [];

    for (const type of fitnessTypes) {
      const data = fitnessResult[type];
      if (!data || data.value === undefined || data.value === null) continue;

      const filtered = standards.filter((s: any) => s.fitness === type);
      if (filtered.length === 0) continue;

      const match = filtered.find(
        (s: any) => Number(s.threshold_value) <= data.value,
      );
      let percentile = match?.percentile_rank ?? 0;

      if (LOWER_IS_BETTER.has(type)) {
        percentile = 100 - percentile;
      }

      percentiles.push(percentile);
    }

    if (percentiles.length === 0) return 0;
    return Math.round(
      percentiles.reduce((a, b) => a + b, 0) / percentiles.length,
    );
  }
}
