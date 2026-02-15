// src/modules/fitness/services/ai-recommender.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { PrismaService } from '../../prisma/prisma.service';

// DTO 타입 정의
export interface FitnessResult {
  CARDIO?: { value: number; grade: number; program: string };
  ENDURANCE?: { value: number; grade: number; program: string };
  FLEXIBILITY?: { value: number; grade: number; program: string };
  STRENGTH?: { value: number; grade: number; program: string };
  QUICKNESS?: { value: number; grade: number; program: string };
  AGILITY?: { value: number; grade: number; program: string };
}

export interface UserInfo {
  age: number;
  gender: 'M' | 'F';
  place: string;  // HOME, GYM, OUTDOOR
  injury?: string;
  disease?: string;
}

export interface WorkoutExercise {
  exerciseId?: number;
  name: string;
  sets: number;
  reps: number;
  duration: number | null;
  rest_seconds: number;
  rpe: number;
  description: string;
}

export interface WorkoutDay {
  date: string;
  focus: string;
  warm_up: string;
  cool_down: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutRecommendation {
  targetFitnessType: string;
  totalDuration: number;
  rpe: number;
  workout_plan: WorkoutDay[];
  notes: string;
}

@Injectable()
export class AIRecommenderService {
  private readonly logger = new Logger(AIRecommenderService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * AI 기반 운동 추천 생성
   */
  async generateRecommendation(
    fitnessResult: FitnessResult,
    userInfo: UserInfo,
  ): Promise<WorkoutRecommendation> {
    this.logger.log(
      `AI 운동 추천 시작 - 나이: ${userInfo.age}, 성별: ${userInfo.gender}`,
    );

    // 1. exercise_program에서 운동 목록 가져오기
    const exercises = await this.getAvailableExercises();

    // 2. Gemini 프롬프트 생성
    const prompt = this.buildPrompt(fitnessResult, userInfo, exercises);

    // 3. Gemini API 호출
    const recommendation = await this.geminiService.generateJSON<WorkoutRecommendation>(
      prompt,
    );

    // 4. exerciseId 매핑 (운동명으로 찾기)
    await this.mapExerciseIds(recommendation, exercises);

    this.logger.log(
      `AI 추천 완료 - 타겟: ${recommendation.targetFitnessType}`,
    );

    return recommendation;
  }

  /**
   * exercise_program에서 모든 운동 가져오기
   */
  private async getAvailableExercises() {
    return await this.prisma.exercise_program.findMany({
      select: {
        exercise_id: true,
        exercise_name: true,
        exercise_step: true,
        fitness_type: true,
        purpose: true,
      },
    });
  }

  /**
   * Gemini 프롬프트 생성
   */
  private buildPrompt(
    fitnessResult: FitnessResult,
    userInfo: UserInfo,
    exercises: any[],
  ): string {
    // 체력 측정 결과 텍스트 생성
    const fitnessText = Object.entries(fitnessResult)
      .map(([type, data]) => {
        const koreanType = this.fitnessTypeToKorean(type);
        return `- ${koreanType}: ${data.grade}등급 (측정값: ${data.value})`;
      })
      .join('\n');

    // 운동 목록 텍스트 생성 (상위 50개만)
    const exerciseList = exercises
      .slice(0, 50)
      .map((ex, i) => `${i + 1}. ${ex.exercise_name}`)
      .join('\n');

    // 장소 한글 변환
    const placeKorean = {
      HOME: '집',
      GYM: '헬스장',
      OUTDOOR: '야외',
    }[userInfo.place] || userInfo.place;

    return `당신은 국민체력100 인증 전문 운동 처방사입니다.

# 사용자 정보
- 나이: ${userInfo.age}세
- 성별: ${userInfo.gender === 'M' ? '남성' : '여성'}
- 운동 장소: ${placeKorean}
${userInfo.injury ? `- 부상: ${userInfo.injury}` : ''}
${userInfo.disease ? `- 질병: ${userInfo.disease}` : ''}

# 체력 측정 결과 (1등급=최상, 4등급=부족)
${fitnessText}

# 가능한 운동 목록
${exerciseList}
(... 총 ${exercises.length}개 운동 중 일부)

# 요구사항
1. **가장 부족한 체력 요소를 targetFitnessType으로 선택**
   - CARDIO(심폐지구력), ENDURANCE(근지구력), FLEXIBILITY(유연성), 
   - STRENGTH(근력), QUICKNESS(순발력), AGILITY(민첩성) 중 선택

2. **주 3일 운동 계획 수립**
   - 각 날짜마다 3-5개 운동 선택
   - 타겟 체력 60% + 보조 체력 40% 비율
   - 근육군 균형 고려

3. **체력 등급에 맞는 강도 설정**
   - 4등급: sets=2, reps=8-10, rest=90초, RPE=4-5
   - 3등급: sets=3, reps=10-12, rest=75초, RPE=5-6
   - 2등급: sets=3, reps=12-15, rest=60초, RPE=6-7
   - 1등급: sets=4, reps=15-20, rest=45초, RPE=7-8

4. **부상/질병 고려**
   - ${userInfo.injury || '없음'} 관련 운동 제외
   - ${userInfo.disease || '없음'} 악화시킬 운동 제외

5. **개인화된 설명 작성 (200자 이내)**
   - 왜 이 체력을 개선해야 하는지
   - 예상 개선 효과
   - 동기부여 메시지

# 출력 형식 (JSON만 출력, 다른 텍스트 절대 포함 금지)
\`\`\`json
{
  "targetFitnessType": "CARDIO",
  "totalDuration": 45,
  "rpe": 6,
  "workout_plan": [
    {
      "date": "${this.getDateString(0)}",
      "focus": "심폐지구력 집중 향상",
      "warm_up": "5분 가벼운 조깅 + 동적 스트레칭",
      "cool_down": "5분 정적 스트레칭 + 심호흡",
      "exercises": [
        {
          "name": "인터벌 러닝(400m)",
          "sets": 3,
          "reps": 1,
          "duration": 3,
          "rest_seconds": 90,
          "rpe": 7,
          "description": "400m 전력질주 후 휴식, 심폐지구력 향상에 효과적"
        }
      ]
    },
    {
      "date": "${this.getDateString(2)}",
      "focus": "...",
      "warm_up": "...",
      "cool_down": "...",
      "exercises": [...]
    },
    {
      "date": "${this.getDateString(4)}",
      "focus": "...",
      "warm_up": "...",
      "cool_down": "...",
      "exercises": [...]
    }
  ],
  "notes": "심폐지구력이 가장 부족하니 유산소 운동을 집중적으로 진행하세요. 주 3회 꾸준히 실시하면 2개월 내 2등급 달성 가능합니다. 유연성도 함께 개선하면 부상 위험을 30% 줄일 수 있습니다."
}
\`\`\`

**중요: 반드시 위 JSON 형식만 출력하세요. 추가 설명이나 마크다운 문법은 넣지 마세요.**`;
  }

  /**
   * 운동명으로 exerciseId 찾아서 매핑
   */
  private async mapExerciseIds(
    recommendation: WorkoutRecommendation,
    exercises: any[],
  ) {
    for (const day of recommendation.workout_plan) {
      for (const exercise of day.exercises) {
        // 운동명으로 exercise_id 찾기
        const found = exercises.find(
          (ex) => ex.exercise_name === exercise.name,
        );

        if (found) {
          exercise.exerciseId = found.exercise_id;
        } else {
          // 못 찾으면 로그만 남기고 계속 진행
          this.logger.warn(`운동 ID를 찾을 수 없음: ${exercise.name}`);
        }
      }
    }
  }

  /**
   * FitnessType을 한글로 변환
   */
  private fitnessTypeToKorean(type: string): string {
    const map: Record<string, string> = {
      CARDIO: '심폐지구력',
      ENDURANCE: '근지구력',
      FLEXIBILITY: '유연성',
      STRENGTH: '근력',
      QUICKNESS: '순발력',
      AGILITY: '민첩성',
    };
    return map[type] || type;
  }

  /**
   * 날짜 문자열 생성 (오늘 + n일, 한국 시간 기준)
   */
  private getDateString(daysFromNow: number): string {
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // UTC+9
    const kstDate = new Date(now.getTime() + kstOffset);
    kstDate.setUTCDate(kstDate.getUTCDate() + daysFromNow);
    return kstDate.toISOString().split('T')[0];
  }
}