import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FitnessService } from './fitness.service';
import { CreateFitnessMeasureDto, QueryFitnessDto } from './dto';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('Fitness')
@Controller('fitness')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FitnessController {
  constructor(private readonly fitnessService: FitnessService) {}

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
    required: true,
    description: '조회할 날짜 (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 400, description: '잘못된 날짜 형식' })
  @ApiResponse({ status: 404, description: '기록 없음' })
  getFitnessChart(
    @CurrentUser('sub') memberId: bigint,
    @Query() query: QueryFitnessDto,
  ) {
    return this.fitnessService.getFitnessChart(memberId, query.measureDay!);
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
}
