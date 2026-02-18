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
  QueryRecommendDto,
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
   * 저장된 추천 운동 조회
   */
  @Get('recommend')
  @ApiOperation({
    summary: '저장된 추천 운동 조회',
    description:
      '저장된 AI 추천 운동 데이터를 조회합니다. measureDay 지정 시 해당 날짜, 미지정 시 가장 최근 데이터를 반환합니다.',
  })
  @ApiQuery({
    name: 'recommendDate',
    required: false,
    description:
      '조회할 추천 날짜 (YYYY-MM-DD). 미입력 시 가장 최근 추천 데이터 반환',
  })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  getRecommendation(
    @CurrentUser('sub') memberId: bigint,
    @Query() query: QueryRecommendDto,
  ) {
    return this.fitnessService.getRecommendation(memberId, query.recommendDate);
  }

  /**
   * AI 기반 운동 추천 생성
   */
  @Post('recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI 운동 추천 생성',
    description:
      '사용자의 가장 최근 체력 측정 결과(28일 이내)를 기반으로 Gemini AI가 개인 맞춤형 운동 계획을 생성합니다.',
  })
  @ApiResponse({ status: 200, description: '추천 생성 성공' })
  @ApiResponse({ status: 400, description: '체력 측정 결과 없음' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async createRecommendation(
    @CurrentUser('sub') memberId: bigint,
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

      // 3. 최근 28일 이내 체력 측정 결과 조회
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstNow = new Date(now.getTime() + kstOffset);
      const today = new Date(
        Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()),
      );
      const twentyEightDaysAgo = new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000);

      const fitnessMeasure = await this.prisma.fitness_measure.findFirst({
        where: {
          member_id: memberId,
          deleted_yn: 'N',
          measure_day: {
            gte: twentyEightDaysAgo,
            lte: today,
          },
        },
        orderBy: { measure_day: 'desc' },
      });

      if (!fitnessMeasure || !fitnessMeasure.fitness_result) {
        return {
          isSuccess: false,
          message: '28일 이내 체력 측정 기록이 없습니다. 체력 측정을 먼저 진행해주세요.',
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

      // 7. 응답 생성 (FE에 필요한 필드만 반환)
      return {
        isSuccess: true,
        message: 'AI 운동 추천이 완료되었습니다.',
        data: {
          recommendationId: Number(savedRecommendation.recommendation_id),
          targetFitnessType: recommendation.targetFitnessType,
          totalDuration: recommendation.totalDuration,
          rpe: recommendation.rpe,
          focus: recommendation.focus,
          warm_up: recommendation.warm_up,
          cool_down: recommendation.cool_down,
          exercises: (recommendation.exercises || []).map((ex: any) => ({
            exerciseId: ex.exerciseId ? Number(ex.exerciseId) : undefined,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            duration: ex.duration ?? null,
            rest_seconds: ex.rest_seconds,
            rpe: ex.rpe,
            description: ex.description,
          })),
          notes: recommendation.notes,
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
        ai_response: JSON.stringify(recommendation, (_, v) =>
          typeof v === 'bigint' ? Number(v) : v,
        ),
        status: 'ACTIVE',
        deleted_yn: 'N',
      },
    });

    // 운동 상세 저장
    for (const exercise of recommendation.exercises) {
        let exerciseId = exercise.exerciseId
          ? BigInt(exercise.exerciseId)
          : null;

        // exerciseId가 없으면 운동명으로 DB 검색
        if (!exerciseId) {
          const existing = await this.prisma.exercise_program.findFirst({
            where: { exercise_name: exercise.name },
          });
          exerciseId = existing?.exercise_id || null;
        }

        // 여전히 없으면 새 운동으로 exercise_program에 추가
        if (!exerciseId) {
          const info = exercise.newExerciseInfo;
          const newProgram = await this.prisma.exercise_program.create({
            data: {
              exercise_name: exercise.name,
              exercise_step: info?.exercise_step || null,
              equipment: info?.equipment || null,
              caution: info?.caution || null,
              fitness_type: info?.fitness_type || null,
              purpose: info?.purpose || null,
            },
          });
          exerciseId = newProgram.exercise_id;
          this.logger.log(`새 운동 등록: ${exercise.name} (ID: ${exerciseId})`);
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

    return dailyRecommendation;
  }
}
