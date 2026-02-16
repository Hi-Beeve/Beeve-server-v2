import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FitnessService } from './fitness.service';
import { AIRecommenderService } from '../common/services/ai-recommender.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFitnessMeasureDto,
  CreateExerciseInfoDto,
  QueryFitnessDto,
} from './dto';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('Fitness')
@Controller('fitness')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FitnessController {
  private readonly logger = new Logger(FitnessController.name);

  constructor(
    private readonly fitnessService: FitnessService,
    private readonly aiRecommenderService: AIRecommenderService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 체력 측정 결과 등록
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '체력 측정 결과 등록' })
  @ApiResponse({ status: 200, description: '측정 등록 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 409, description: '하루 1회 제한' })
  createFitnessMeasure(
    @CurrentUser('sub') memberId: bigint,
    @Body() dto: CreateFitnessMeasureDto,
  ) {
    return this.fitnessService.createFitnessMeasure(memberId, dto);
  }

  /**
   * 운동 정보 등록
   */
  @Post('exercise-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '운동 정보 등록',
    description:
      '운동 목표, 장소, 장비, 부상/질병 정보를 등록합니다. 기존 정보가 있으면 논리 삭제 후 새로 등록됩니다.',
  })
  @ApiResponse({ status: 200, description: '등록 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  createExerciseInfo(
    @CurrentUser('sub') memberId: bigint,
    @Body() dto: CreateExerciseInfoDto,
  ) {
    return this.fitnessService.createExerciseInfo(memberId, dto);
  }

  /**
   * 운동 정보 조회
   */
  @Get('exercise-info')
  @ApiOperation({ summary: '운동 정보 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '운동 정보 없음' })
  getExerciseInfo(@CurrentUser('sub') memberId: bigint) {
    return this.fitnessService.getExerciseInfo(memberId);
  }

  /**
   * 측정 날짜 목록 조회
   */
  @Get('measure-days')
  @ApiOperation({ summary: '측정 날짜 목록 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '기록 없음' })
  getMeasureDays(@CurrentUser('sub') memberId: bigint) {
    return this.fitnessService.getMeasureDays(memberId);
  }

  /**
   * 날짜별 6각형 차트 조회
   */
  @Get()
  @ApiOperation({ summary: '날짜별 6각형 차트 조회' })
  @ApiQuery({
    name: 'measureDay',
    required: false,
    description: '조회할 날짜 (YYYY-MM-DD). 미입력 시 가장 최근 측정 데이터 반환',
  })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 400, description: '잘못된 날짜 형식' })
  @ApiResponse({ status: 404, description: '기록 없음' })
  getFitnessChart(
    @CurrentUser('sub') memberId: bigint,
    @Query() query: QueryFitnessDto,
  ) {
    return this.fitnessService.getFitnessChart(memberId, query.measureDay);
  }

  /**
   * 등급 히스토리 조회 (간단)
   */
  @Get('grade')
  @ApiOperation({ summary: '등급 히스토리 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '기록 없음' })
  getGradeHistory(@CurrentUser('sub') memberId: bigint) {
    return this.fitnessService.getGradeHistory(memberId);
  }

  /**
   * AI 기반 운동 추천
   */
  @Get('recommend')
  @ApiOperation({
    summary: 'AI 운동 추천',
    description:
      '사용자의 체력 측정 결과를 기반으로 Gemini AI가 개인 맞춤형 운동 계획을 생성합니다.',
  })
  @ApiQuery({
    name: 'measureDay',
    required: false,
    description:
      '조회할 날짜 (YYYY-MM-DD). 미입력 시 가장 최근 측정 데이터 사용',
  })
  @ApiResponse({ status: 200, description: '추천 성공' })
  @ApiResponse({ status: 400, description: '체력 측정 결과 없음' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async getRecommendation(
    @CurrentUser('sub') memberId: bigint,
    @Query() query: QueryFitnessDto,
  ) {
    this.logger.log(`운동 추천 요청 - 사용자 ID: ${memberId}`);

    try {
      // 1. 사용자 정보 조회
      const member = await this.prisma.member.findUnique({
        where: { member_id: memberId },
        select: {
          member_id: true,
          birth_date: true,
          gender: true,
        },
      });

      if (!member || !member.birth_date) {
        return {
          isSuccess: false,
          message: '사용자 정보가 불완전합니다.',
          data: null,
        };
      }

      // 2. 운동 정보 조회 (장소, 부상, 질병)
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
          isSuccess: false,
          message: '운동 정보를 먼저 입력해주세요.',
          data: null,
        };
      }

      // 3. 체력 측정 결과 조회 (measureDay 지정 시 해당 날짜, 미지정 시 최근)
      const fitnessMeasure = await this.prisma.fitness_measure.findFirst({
        where: {
          member_id: memberId,
          deleted_yn: 'N',
          ...(query.measureDay
            ? { measure_day: new Date(query.measureDay) }
            : {}),
        },
        ...(!query.measureDay && {
          orderBy: { measure_day: 'desc' as const },
        }),
      });

      if (!fitnessMeasure || !fitnessMeasure.fitness_result) {
        return {
          isSuccess: false,
          message: '체력 측정을 먼저 진행해주세요.',
          data: null,
        };
      }

      // 4. 나이 계산
      const age =
        new Date().getFullYear() - member.birth_date.getFullYear();

      // 5. AI 추천 생성
      const recommendation =
        await this.aiRecommenderService.generateRecommendation(
          fitnessMeasure.fitness_result as any,
          {
            age,
            gender: member.gender as 'M' | 'F',
            place: exerciseInfo.place,
            injury: exerciseInfo.injury || undefined,
            disease: exerciseInfo.disease || undefined,
          },
        );

      // 6. DB에 저장 (daily_recommendation & daily_recommendation_exercise)
      const savedRecommendation = await this.saveRecommendation(
        memberId,
        recommendation,
      );

      // 7. 응답 생성
      return {
        isSuccess: true,
        message: 'AI 운동 추천이 완료되었습니다.',
        data: {
          recommendationId: savedRecommendation.recommendation_id,
          ...recommendation,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('운동 추천 실패:', error);

      return {
        isSuccess: false,
        message: `운동 추천 중 오류가 발생했습니다: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * 추천 운동을 DB에 저장
   */
  private async saveRecommendation(memberId: bigint, recommendation: any) {
    // 기존 추천 삭제 (논리 삭제)
    await this.prisma.daily_recommendation.updateMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      data: {
        deleted_yn: 'Y',
      },
    });

    // 새 추천 저장
    const dailyRecommendation = await this.prisma.daily_recommendation.create({
      data: {
        member_id: memberId,
        total_duration: recommendation.totalDuration,
        rpe: recommendation.rpe,
        target_fitness_type: recommendation.targetFitnessType,
        ai_response: JSON.stringify(recommendation),
        status: 'ACTIVE',
        deleted_yn: 'N',
      },
    });

    // 운동 상세 저장
    for (const day of recommendation.workout_plan) {
      for (const exercise of day.exercises) {
        // exercise_program에서 exercise_id 찾기
        let exerciseId = exercise.exerciseId;

        if (!exerciseId) {
          const exerciseProgram =
            await this.prisma.exercise_program.findFirst({
              where: {
                exercise_name: exercise.name,
              },
            });
          exerciseId = exerciseProgram?.exercise_id || BigInt(1);
        }

        await this.prisma.daily_recommendation_exercise.create({
          data: {
            recommendation_id: dailyRecommendation.recommendation_id,
            exercise_id: exerciseId,
            exercise_name: exercise.name,
            reps: exercise.reps,
            sets: exercise.sets,
            rest_seconds: exercise.rest_seconds,
            duration: exercise.duration,
          },
        });
      }
    }

    return dailyRecommendation;
  }
}
