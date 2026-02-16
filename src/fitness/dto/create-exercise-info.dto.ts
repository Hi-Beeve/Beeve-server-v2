import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum ExerciseGoal {
  FITNESS_IMPROVEMENT = '체력증진',
  MUSCLE_GAIN = '근육량 증가',
  STRENGTH = '근력 강화',
  FAT_LOSS = '지방감소',
  FLEXIBILITY = '유연성 향상',
  COMPETITION = '대회준비',
  RECOVERY = '건강회복',
  STRESS_RELIEF = '스트레스해소',
  HABIT_BUILDING = '운동습관 형성',
}

export enum ExercisePlace {
  HOME = '집',
  OUTDOOR = '야외',
  GYM = '헬스장',
}

// exercise_program 테이블의 equipment 항목 목록:
// 계단, 덤벨, 딥스바, 메디신 볼, 바벨, 박스 혹은 의자, 배틀로프,
// 버티컬 클라이머 머신, 벽, 소파, 스텝레더, 스텝박스, 없음,
// 에어바이크, 의자/소파, 자전거, 줄넘기, 짐볼, 철봉, 케틀벨, 콘, 탄력밴드, 트레드밀
export enum Equipment {
  STAIRS = '계단',
  DUMBBELL = '덤벨',
  DIP_BAR = '딥스바',
  MEDICINE_BALL = '메디신 볼',
  BARBELL = '바벨',
  BOX_OR_CHAIR = '박스 혹은 의자',
  BATTLE_ROPE = '배틀로프',
  VERTICAL_CLIMBER = '버티컬 클라이머 머신',
  WALL = '벽',
  SOFA = '소파',
  STEP_LADDER = '스텝레더',
  STEP_BOX = '스텝박스',
  NONE = '없음',
  AIR_BIKE = '에어바이크',
  CHAIR_SOFA = '의자/소파',
  BICYCLE = '자전거',
  JUMP_ROPE = '줄넘기',
  GYM_BALL = '짐볼',
  PULL_UP_BAR = '철봉',
  KETTLEBELL = '케틀벨',
  CONE = '콘',
  RESISTANCE_BAND = '탄력밴드',
  TREADMILL = '트레드밀',
}

export enum HealthIssueType {
  DISEASE = 'disease',
  INJURY = 'injury',
}

export class CreateExerciseInfoDto {
  @ApiProperty({
    example: '체력증진',
    description: '운동 목표',
    enum: ExerciseGoal,
    enumName: 'ExerciseGoal',
  })
  @IsEnum(ExerciseGoal)
  goal: ExerciseGoal;

  @ApiProperty({
    example: '헬스장',
    description: '운동 장소',
    enum: ExercisePlace,
    enumName: 'ExercisePlace',
  })
  @IsEnum(ExercisePlace)
  place: ExercisePlace;

  @ApiProperty({
    example: ['덤벨', '바벨'],
    description: '보유 장비 목록 (1개 이상 선택)',
    enum: Equipment,
    enumName: 'Equipment',
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(Equipment, { each: true })
  equipment: Equipment[];

  @ApiProperty({
    example: 'disease',
    description: '부상 또는 질병 중 택1 (입력 시 healthIssueText 필수)',
    enum: HealthIssueType,
    enumName: 'HealthIssueType',
    required: false,
  })
  @IsOptional()
  @IsEnum(HealthIssueType)
  healthIssueType?: HealthIssueType;

  @ApiProperty({
    example: '허리디스크',
    description: '부상/질병 상세 (10자 이내)',
    required: false,
  })
  @ValidateIf((o) => o.healthIssueType !== undefined)
  @IsString()
  @MaxLength(10)
  healthIssueText?: string;
}
