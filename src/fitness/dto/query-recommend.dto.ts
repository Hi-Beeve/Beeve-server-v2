import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class QueryRecommendDto {
  @ApiProperty({
    example: '2025-02-07',
    description: '조회할 추천 날짜 (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  recommendDate?: string;
}
