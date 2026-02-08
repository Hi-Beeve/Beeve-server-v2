import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RankService } from './rank.service';
import { CurrentUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/guards';

@ApiTags('Rank')
@Controller('rank')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RankController {
  constructor(private readonly rankService: RankService) {}

  /**
   * 연령대 순위 조회
   */
  @Get('age-group')
  @ApiOperation({ summary: '연령대 순위 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '데이터 없음' })
  getAgeGroupRank(@CurrentUser('sub') memberId: bigint) {
    return this.rankService.getAgeGroupRank(memberId);
  }

  /**
   * 체력 등급 상세 히스토리
   */
  @Get('history')
  @ApiOperation({ summary: '체력 등급 상세 히스토리' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '기록 없음' })
  getGradeHistory(@CurrentUser('sub') memberId: bigint) {
    return this.rankService.getGradeHistory(memberId);
  }
}
