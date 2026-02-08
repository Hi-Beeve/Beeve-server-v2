// src/modules/fitness/dto/recommend-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class WorkoutExerciseDto {
  @ApiProperty({ example: 45, description: '운동 ID' })
  exerciseId?: number;

  @ApiProperty({ example: '인터벌 러닝(400m)', description: '운동 이름' })
  name: string;

  @ApiProperty({ example: 3, description: '세트 수' })
  sets: number;

  @ApiProperty({ example: 1, description: '반복 횟수' })
  reps: number;

  @ApiProperty({ example: 3, description: '운동 시간 (분)', nullable: true })
  duration: number | null;

  @ApiProperty({ example: 90, description: '휴식 시간 (초)' })
  rest_seconds: number;

  @ApiProperty({ example: 7, description: '운동 강도 (1-10)' })
  rpe: number;

  @ApiProperty({
    example: '400m 전력질주 후 휴식, 심폐지구력 향상에 효과적',
    description: '운동 설명',
  })
  description: string;
}

export class WorkoutDayDto {
  @ApiProperty({ example: '2025-02-08', description: '운동 날짜 (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: '심폐지구력 집중 향상', description: '운동 초점' })
  focus: string;

  @ApiProperty({ example: '5분 가벼운 조깅 + 동적 스트레칭', description: '준비 운동' })
  warm_up: string;

  @ApiProperty({ example: '5분 정적 스트레칭 + 심호흡', description: '정리 운동' })
  cool_down: string;

  @ApiProperty({ type: [WorkoutExerciseDto], description: '운동 목록' })
  exercises: WorkoutExerciseDto[];
}

export class RecommendationDataDto {
  @ApiProperty({ example: 123, description: '추천 ID' })
  recommendationId: number;

  @ApiProperty({ example: 'CARDIO', description: '집중 개선 체력 항목' })
  targetFitnessType: string;

  @ApiProperty({ example: 45, description: '총 운동 시간 (분)' })
  totalDuration: number;

  @ApiProperty({ example: 7, description: '전체 운동 강도 (1-10)' })
  rpe: number;

  @ApiProperty({ type: [WorkoutDayDto], description: '운동 계획 배열' })
  workout_plan: WorkoutDayDto[];

  @ApiProperty({
    example: '심폐지구력이 가장 부족하니 유산소 운동을 집중적으로 진행하세요...',
    description: 'AI 추천 설명',
  })
  notes: string;

  @ApiProperty({ example: '2025-02-07T15:30:00Z', description: '추천 생성 일시' })
  createdAt: string;
}

export class RecommendResponseDto {
  @ApiProperty({ example: true, description: '성공 여부' })
  isSuccess: boolean;

  @ApiProperty({ example: '200', description: '응답 코드' })
  code: string;

  @ApiProperty({ example: 'AI 운동 추천이 완료되었습니다.', description: '메시지' })
  message?: string;

  @ApiProperty({ type: RecommendationDataDto, nullable: true })
  data: RecommendationDataDto | null;
}