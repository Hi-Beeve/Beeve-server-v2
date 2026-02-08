import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export enum MeasurePlace {
  GYM = 'GYM',
  HOME = 'HOME',
  OUTDOOR = 'OUTDOOR',
}

export class CreateFitnessMeasureDto {
  @ApiProperty({
    example: 'GYM',
    description: '측정 장소',
    enum: MeasurePlace,
  })
  @IsEnum(MeasurePlace)
  measurePlace: MeasurePlace;

  @ApiProperty({
    example: 7,
    description: '운동 강도 (RPE 1-10)',
  })
  @IsInt()
  @Min(1)
  @Max(10)
  rpe: number;

  @ApiProperty({
    example: 10,
    description: '벽 푸시업 횟수',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  wallPushUpReps?: number;

  @ApiProperty({
    example: 15,
    description: '무릎 푸시업 횟수',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  kneePushUpReps?: number;

  @ApiProperty({
    example: 25,
    description: '일반 푸시업 횟수',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  standardPushUpReps?: number;

  @ApiProperty({
    example: 120,
    description: '회복기 심박수 (Step Test)',
  })
  @IsInt()
  @Min(0)
  stepTestRecoveryBpm: number;

  @ApiProperty({
    example: 30,
    description: '교차 윗몸일으키기 횟수',
  })
  @IsInt()
  @Min(0)
  crossCrunchReps: number;

  @ApiProperty({
    example: 15.5,
    description: '앉아 윗몸 앞으로 굽히기 (cm)',
  })
  @IsNumber()
  sitAndReach: number;

  @ApiProperty({
    example: 0.25,
    description: '반응시간 (초)',
  })
  @IsNumber()
  @Min(0)
  reactionTime: number;

  @ApiProperty({
    example: 0.45,
    description: '체공시간 (초)',
  })
  @IsNumber()
  @Min(0)
  flightTime: number;
}
