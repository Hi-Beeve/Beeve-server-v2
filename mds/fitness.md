# 🏋️ Beeve 체력측정 API 완전 구현 가이드

## 📋 목차
1. [개요](#개요)
2. [전체 API 목록](#전체-api-목록)
3. [API 상세 명세](#api-상세-명세)
4. [구현 가이드](#구현-가이드)
5. [에러 코드](#에러-코드)
6. [테스트 시나리오](#테스트-시나리오)

---

## 개요

### 주요 기능
- ✅ 체력 측정 결과 등록 (6가지 항목)
- ✅ 측정 날짜 목록 조회
- ✅ 날짜별 6각형 차트 조회
- ✅ 등급 히스토리 조회
- ✅ 연령대 순위 조회
- ✅ 체력 등급 상세 히스토리
- ✅ AI 운동 추천

### 기술 스택
- NestJS + Prisma
- PostgreSQL (Supabase)
- JWT Authentication
- VO2MAX: 조선대학교 연구 기반 공식

---

## 전체 API 목록

### Fitness 관련 (체력측정)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/fitness` | 체력 측정 결과 등록 |
| GET | `/api/fitness/measure-days` | 측정 날짜 목록 조회 |
| GET | `/api/fitness?measureDay={date}` | 날짜별 6각형 차트 조회 |
| GET | `/api/fitness/grade` | 등급 히스토리 조회 (간단) |

### Rank 관련 (순위)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/rank/age-group` | 연령대 순위 조회 |
| GET | `/api/rank/history` | 체력 등급 상세 히스토리 |

### Recommendation 관련 (운동 추천)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/fitness/recommend` | AI 기반 운동 추천 |

---

## API 상세 명세

### 1. 체력 측정 결과 등록

```http
POST /api/fitness
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Body**
```json
{
  "measurePlace": "GYM",
  "rpe": 7,
  "standardPushUpReps": 25,
  "stepTestRecoveryBpm": 120,
  "crossCrunchReps": 30,
  "sitAndReach": 15.5,
  "reactionTime": 0.25,
  "flightTime": 0.45
}
```

**필드 상세**

| 필드 | 타입 | 필수 | 설명 | 값 범위 |
|------|------|------|------|---------|
| `measurePlace` | string | ✅ | 측정 장소 | "GYM", "HOME", "OUTDOOR" |
| `rpe` | number | ✅ | 운동 강도 | 1-10 |
| `wallPushUpReps` | number | ⚠️ | 벽 푸시업 횟수 | 0 이상 |
| `kneePushUpReps` | number | ⚠️ | 무릎 푸시업 횟수 | 0 이상 |
| `standardPushUpReps` | number | ⚠️ | 일반 푸시업 횟수 | 0 이상 |
| `stepTestRecoveryBpm` | number | ✅ | 회복기 심박수 | 0 이상 |
| `crossCrunchReps` | number | ✅ | 교차 윗몸일으키기 | 0 이상 |
| `sitAndReach` | number | ✅ | 앉아 윗몸 앞으로 굽히기 (cm) | - |
| `reactionTime` | number | ✅ | 반응시간 (초) | 0 이상 |
| `flightTime` | number | ✅ | 체공시간 (초) | 0 이상 |

⚠️ **근력 측정**: `wallPushUpReps`, `kneePushUpReps`, `standardPushUpReps` 중 **정확히 하나만** 입력

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200"
}
```

#### Response Error

**하루 1회 제한**
```json
{
  "isSuccess": false,
  "code": "FITNESS301",
  "message": "체력 측정은 하루에 1번만 가능합니다."
}
```

**필수 필드 누락**
```json
{
  "isSuccess": false,
  "code": "FITNESS303",
  "message": "필수 측정 항목이 누락되었습니다."
}
```

**근력 측정 필드 오류**
```json
{
  "isSuccess": false,
  "code": "FITNESS304",
  "message": "근력 측정 시 wallPushUpReps, kneePushUpReps, standardPushUpReps 중 정확히 하나만 입력해야 합니다."
}
```

**사용자 정보 불완전**
```json
{
  "isSuccess": false,
  "code": "FITNESS305",
  "message": "사용자 정보(생년월일, 신장, 체중)가 완전하지 않습니다."
}
```

---

### 2. 측정 날짜 목록 조회

```http
GET /api/fitness/measure-days
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
```

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "measureDays": [
      "2025-02-07",
      "2025-02-01",
      "2025-01-25",
      "2025-01-15",
      "2024-12-20"
    ]
  }
}
```

**필드 설명**
- `measureDays`: 측정한 날짜 목록 (최신순 정렬)
- 형식: `YYYY-MM-DD`

#### Response Error

**측정 기록 없음**
```json
{
  "isSuccess": false,
  "code": "FITNESS302",
  "message": "체력 측정 기록이 존재하지 않습니다."
}
```

---

### 3. 날짜별 6각형 차트 조회

```http
GET /api/fitness?measureDay=2025-02-07
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
```

**Query Parameters**

| 파라미터 | 타입 | 필수 | 설명 | 형식 |
|----------|------|------|------|------|
| `measureDay` | string | ✅ | 조회할 날짜 | YYYY-MM-DD |

**예시**
```
GET /api/fitness?measureDay=2025-02-07
```

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "totalGrade": 1,
    "totalRank": 234,
    "measureDay": "2025-02-07",
    "measurePlace": "GYM",
    "rpe": 7,
    "height": 175.5,
    "weight": 70.0,
    "bmi": 22.8,
    "age": 28,
    "gender": "M",
    "fitness": [
      {
        "fitnessType": "STRENGTH",
        "program": "STANDARD_PUSH_UP",
        "value": 17.5,
        "rawValue": 25,
        "grade": 1
      },
      {
        "fitnessType": "CARDIO",
        "program": "VO2MAX",
        "value": 43.51,
        "rawValue": 120,
        "grade": 2
      },
      {
        "fitnessType": "ENDURANCE",
        "program": "CROSS_CRUNCH",
        "value": 30,
        "grade": 1
      },
      {
        "fitnessType": "FLEXIBILITY",
        "program": "SIT_AND_REACH",
        "value": 15.5,
        "grade": 2
      },
      {
        "fitnessType": "AGILITY",
        "program": "REACTION_TIME",
        "value": 0.25,
        "grade": 1
      },
      {
        "fitnessType": "QUICKNESS",
        "program": "FLIGHT_TIME",
        "value": 0.45,
        "grade": 1
      }
    ]
  }
}
```

**필드 설명**

| 필드 | 타입 | 설명 |
|------|------|------|
| `totalGrade` | number | 종합 등급 (1-4) |
| `totalRank` | number | 전체 순위 (동년배 내) |
| `measureDay` | string | 측정 날짜 |
| `measurePlace` | string | 측정 장소 |
| `rpe` | number | 운동 강도 (1-10) |
| `height` | number | 신장 (cm) |
| `weight` | number | 체중 (kg) |
| `bmi` | number | BMI |
| `age` | number | 나이 |
| `gender` | string | 성별 (M/F) |
| `fitness` | array | 6가지 체력 측정 결과 |

**fitness 배열 상세**

| 필드 | 타입 | 설명 |
|------|------|------|
| `fitnessType` | string | 체력 유형 |
| `program` | string | 측정 프로그램 |
| `value` | number | 측정값 또는 계산값 |
| `rawValue` | number | 원 측정값 (STRENGTH, CARDIO만) |
| `grade` | number | 등급 (1-4 또는 1-3) |

**fitnessType 종류**
- `STRENGTH`: 근력
- `CARDIO`: 심폐지구력
- `ENDURANCE`: 근지구력
- `FLEXIBILITY`: 유연성
- `AGILITY`: 민첩성
- `QUICKNESS`: 순발력

**value vs rawValue**
- `STRENGTH`
  - `value`: 가중값 (reps × weight / 100)
  - `rawValue`: 실제 횟수
- `CARDIO`
  - `value`: VO2MAX 추정치
  - `rawValue`: 회복기 심박수 (bpm)
- 나머지 항목: `value`만 존재 (rawValue 없음)

#### Response Error

**측정 기록 없음**
```json
{
  "isSuccess": false,
  "code": "FITNESS302",
  "message": "해당 날짜의 체력 측정 기록이 존재하지 않습니다."
}
```

**잘못된 날짜 형식**
```json
{
  "isSuccess": false,
  "code": "FITNESS306",
  "message": "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요."
}
```

---

### 4. 등급 히스토리 조회 (간단)

```http
GET /api/fitness/grade
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
```

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200",
  "data": [
    {
      "date": "2025-02-07",
      "grade": 1
    },
    {
      "date": "2025-02-01",
      "grade": 1
    },
    {
      "date": "2025-01-25",
      "grade": 2
    },
    {
      "date": "2025-01-15",
      "grade": 2
    },
    {
      "date": "2024-12-20",
      "grade": 2
    }
  ]
}
```

**필드 설명**
- 최신순 정렬
- `date`: 측정 날짜
- `grade`: 해당 날짜의 종합 등급 (1-4)

#### Response Error

```json
{
  "isSuccess": false,
  "code": "FITNESS302",
  "message": "체력 측정 기록이 존재하지 않습니다."
}
```

---

### 5. 연령대 순위 조회

```http
GET /api/rank/age-group
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
```

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "currentRank": {
      "rank": 234,
      "totalPeople": 15420,
      "percentile": 15
    },
    "rankHistoryList": [
      {
        "rank": 234,
        "date": "2025-02-07"
      },
      {
        "rank": 275,
        "date": "2025-02-01"
      },
      {
        "rank": 310,
        "date": "2025-01-25"
      }
    ],
    "fitnessRankList": [
      {
        "type": "STRENGTH",
        "rank": 150,
        "percentile": 10
      },
      {
        "type": "CARDIO",
        "rank": 320,
        "percentile": 20
      },
      {
        "type": "ENDURANCE",
        "rank": 180,
        "percentile": 12
      },
      {
        "type": "FLEXIBILITY",
        "rank": 420,
        "percentile": 27
      },
      {
        "type": "AGILITY",
        "rank": 210,
        "percentile": 14
      },
      {
        "type": "QUICKNESS",
        "rank": 190,
        "percentile": 12
      }
    ]
  }
}
```

**필드 설명**

**currentRank**: 현재 순위 정보
- `rank`: 동년배 내 순위
- `totalPeople`: 전체 비교 대상 인원
- `percentile`: 상위 몇 % (낮을수록 좋음)

**rankHistoryList**: 순위 변화 추이
- `rank`: 해당 날짜의 순위
- `date`: 측정 날짜

**fitnessRankList**: 각 체력 항목별 순위
- `type`: 체력 항목
- `rank`: 해당 항목의 순위
- `percentile`: 상위 몇 %

#### Response Error

```json
{
  "isSuccess": false,
  "code": "RANK301",
  "message": "순위 계산을 위한 충분한 데이터가 없습니다."
}
```

---

### 6. 체력 등급 상세 히스토리

```http
GET /api/rank/history
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
```

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "totalGradeList": [
      { "grade": 1, "date": "2025-02-07" },
      { "grade": 1, "date": "2025-02-01" },
      { "grade": 2, "date": "2025-01-25" },
      { "grade": 2, "date": "2025-01-15" }
    ],
    "strengthGradeList": [
      { "grade": 1, "date": "2025-02-07" },
      { "grade": 1, "date": "2025-02-01" },
      { "grade": 2, "date": "2025-01-25" }
    ],
    "cardioGradeList": [
      { "grade": 2, "date": "2025-02-07" },
      { "grade": 2, "date": "2025-02-01" },
      { "grade": 2, "date": "2025-01-25" }
    ],
    "enduranceGradeList": [
      { "grade": 1, "date": "2025-02-07" },
      { "grade": 1, "date": "2025-02-01" },
      { "grade": 2, "date": "2025-01-25" }
    ],
    "flexibilityGradeList": [
      { "grade": 2, "date": "2025-02-07" },
      { "grade": 2, "date": "2025-02-01" },
      { "grade": 3, "date": "2025-01-25" }
    ],
    "agilityGradeList": [
      { "grade": 1, "date": "2025-02-07" },
      { "grade": 1, "date": "2025-02-01" },
      { "grade": 1, "date": "2025-01-25" }
    ],
    "quicknessGradeList": [
      { "grade": 1, "date": "2025-02-07" },
      { "grade": 1, "date": "2025-02-01" },
      { "grade": 2, "date": "2025-01-25" }
    ]
  }
}
```

**필드 설명**
- 각 체력 항목별 등급 변화 추이
- 최신순 정렬
- `grade`: 등급 (1-4 또는 1-3)
- `date`: 측정 날짜

**리스트 종류**
- `totalGradeList`: 종합 등급
- `strengthGradeList`: 근력
- `cardioGradeList`: 심폐지구력
- `enduranceGradeList`: 근지구력
- `flexibilityGradeList`: 유연성
- `agilityGradeList`: 민첩성
- `quicknessGradeList`: 순발력

#### Response Error

```json
{
  "isSuccess": false,
  "code": "FITNESS302",
  "message": "체력 측정 기록이 존재하지 않습니다."
}
```

---

### 7. AI 기반 운동 추천

```http
GET /api/fitness/recommend
```

#### Request

**Headers**
```
Authorization: Bearer {accessToken}
```

#### Response Success (200)

```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "recommendationId": 123,
    "targetFitnessType": "CARDIO",
    "totalDuration": 45,
    "rpe": 7,
    "workout_plan": [
      {
        "date": "2025-02-08",
        "focus": "심폐지구력 및 근지구력 향상",
        "warm_up": "5분 가벼운 조깅 + 동적 스트레칭",
        "cool_down": "5분 정적 스트레칭",
        "exercises": [
          {
            "exerciseId": 45,
            "name": "인터벌 러닝",
            "sets": 5,
            "reps": 1,
            "duration": 3,
            "rest_seconds": 90,
            "rpe": 8,
            "description": "400m 전력질주 후 90초 휴식"
          },
          {
            "exerciseId": 78,
            "name": "버피 테스트",
            "sets": 3,
            "reps": 15,
            "duration": null,
            "rest_seconds": 60,
            "rpe": 7,
            "description": "전신 운동으로 심폐지구력 향상"
          },
          {
            "exerciseId": 92,
            "name": "플랭크",
            "sets": 3,
            "reps": 1,
            "duration": 1,
            "rest_seconds": 45,
            "rpe": 6,
            "description": "코어 안정성 강화"
          }
        ]
      },
      {
        "date": "2025-02-10",
        "focus": "유연성 및 회복",
        "warm_up": "5분 가벼운 스트레칭",
        "cool_down": "5분 명상 및 호흡",
        "exercises": [
          {
            "exerciseId": 120,
            "name": "요가 루틴",
            "sets": 1,
            "reps": 1,
            "duration": 30,
            "rest_seconds": 0,
            "rpe": 4,
            "description": "전신 유연성 향상"
          }
        ]
      }
    ],
    "notes": "심폐지구력이 가장 부족하니 유산소 운동을 집중적으로 진행하세요. 유연성도 함께 개선하면 부상 예방에 도움이 됩니다.",
    "createdAt": "2025-02-07T15:30:00Z"
  }
}
```

**필드 설명**

**상위 레벨**
- `recommendationId`: 추천 ID
- `targetFitnessType`: 집중 개선 체력 항목
- `totalDuration`: 총 운동 시간 (분)
- `rpe`: 전체 운동 강도 (1-10)
- `workout_plan`: 운동 계획 배열
- `notes`: AI 추천 설명
- `createdAt`: 추천 생성 일시

**workout_plan 각 항목**
- `date`: 운동 날짜 (YYYY-MM-DD)
- `focus`: 해당 날짜의 운동 초점
- `warm_up`: 준비 운동
- `cool_down`: 정리 운동
- `exercises`: 운동 목록

**exercises 각 항목**
- `exerciseId`: 운동 ID
- `name`: 운동 이름
- `sets`: 세트 수
- `reps`: 반복 횟수
- `duration`: 운동 시간 (분, nullable)
- `rest_seconds`: 휴식 시간 (초)
- `rpe`: 해당 운동 강도 (1-10)
- `description`: 운동 설명

#### Response Error

**최근 측정 기록 없음**
```json
{
  "isSuccess": false,
  "code": "RECOMMEND301",
  "message": "운동 추천을 위한 최근 체력 측정 기록이 없습니다."
}
```

**운동 정보 없음**
```json
{
  "isSuccess": false,
  "code": "RECOMMEND302",
  "message": "운동 목표 및 장소 정보가 설정되지 않았습니다."
}
```

---

## 구현 가이드

### Step 1: DTOs 작성

#### CreateFitnessMeasureDto
```typescript
import { IsEnum, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { MeasurePlace } from '../interfaces/fitness-type.enum';

export class CreateFitnessMeasureDto {
  @IsEnum(MeasurePlace)
  measurePlace: MeasurePlace;

  @IsInt()
  @Min(1)
  @Max(10)
  rpe: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  wallPushUpReps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  kneePushUpReps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  standardPushUpReps?: number;

  @IsInt()
  @Min(0)
  stepTestRecoveryBpm: number;

  @IsInt()
  @Min(0)
  crossCrunchReps: number;

  @IsNumber()
  sitAndReach: number;

  @IsNumber()
  @Min(0)
  reactionTime: number;

  @IsNumber()
  @Min(0)
  flightTime: number;
}
```

#### QueryFitnessDto
```typescript
import { IsDateString, IsOptional } from 'class-validator';

export class QueryFitnessDto {
  @IsOptional()
  @IsDateString()
  measureDay?: string; // YYYY-MM-DD
}
```

---

### Step 2: FitnessService (조회 부분)

```typescript
/**
 * 측정 날짜 목록 조회
 */
async getMeasureDays(memberId: number) {
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

  if (!measures || measures.length === 0) {
    throw new NotFoundException({
      isSuccess: false,
      code: 'FITNESS302',
      message: '체력 측정 기록이 존재하지 않습니다.',
    });
  }

  const measureDays = measures.map(m => 
    m.measure_day.toISOString().split('T')[0]
  );

  return {
    isSuccess: true,
    code: '200',
    data: {
      measureDays,
    },
  };
}

/**
 * 날짜별 6각형 차트 조회
 */
async getFitnessChart(memberId: number, measureDay: string) {
  // 날짜 파싱
  const targetDate = new Date(measureDay);
  if (isNaN(targetDate.getTime())) {
    throw new BadRequestException({
      isSuccess: false,
      code: 'FITNESS306',
      message: '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.',
    });
  }

  // 측정 기록 조회
  const measure = await this.prisma.fitness_measure.findFirst({
    where: {
      member_id: memberId,
      measure_day: targetDate,
      deleted_yn: 'N',
    },
  });

  if (!measure) {
    throw new NotFoundException({
      isSuccess: false,
      code: 'FITNESS302',
      message: '해당 날짜의 체력 측정 기록이 존재하지 않습니다.',
    });
  }

  // fitness_result JSON 파싱
  const fitnessResult = measure.fitness_result as any;
  const fitness = [];

  for (const [type, data] of Object.entries(fitnessResult)) {
    fitness.push({
      fitnessType: type,
      program: data.program,
      value: data.value,
      rawValue: data.rawValue || undefined,
      grade: data.grade,
    });
  }

  // 종합 등급 계산
  const grades = fitness.map(f => f.grade);
  const totalGrade = this.gradeCalculator.calculateTotalGrade(grades);

  // 순위 계산 (나중에 구현)
  const totalRank = await this.calculateRank(memberId, measureDay);

  return {
    isSuccess: true,
    code: '200',
    data: {
      totalGrade,
      totalRank,
      measureDay,
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
async getGradeHistory(memberId: number) {
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
    throw new NotFoundException({
      isSuccess: false,
      code: 'FITNESS302',
      message: '체력 측정 기록이 존재하지 않습니다.',
    });
  }

  const gradeHistory = measures.map(m => {
    const fitnessResult = m.fitness_result as any;
    const grades = Object.values(fitnessResult).map((data: any) => data.grade);
    const totalGrade = this.gradeCalculator.calculateTotalGrade(grades);

    return {
      date: m.measure_day.toISOString().split('T')[0],
      grade: totalGrade,
    };
  });

  return {
    isSuccess: true,
    code: '200',
    data: gradeHistory,
  };
}

/**
 * 순위 계산 (Helper)
 */
private async calculateRank(memberId: number, measureDay: string): Promise<number> {
  // 1. 사용자 정보 조회
  const member = await this.prisma.member.findUnique({
    where: { member_id: memberId },
  });

  const age = calculateAge(member.birth_date);
  const ageRange = getAgeRange(age);

  // 2. 동년배 전체 측정 기록 조회
  const allMeasures = await this.prisma.fitness_measure.findMany({
    where: {
      gender: member.gender,
      age_range: {
        path: ['min'],
        equals: ageRange.min,
      },
      deleted_yn: 'N',
    },
    select: {
      member_id: true,
      fitness_result: true,
    },
  });

  // 3. 각 사용자별 최신 종합 등급 계산
  const userGrades = new Map<number, number>();
  
  for (const measure of allMeasures) {
    const fitnessResult = measure.fitness_result as any;
    const grades = Object.values(fitnessResult).map((data: any) => data.grade);
    const totalGrade = this.gradeCalculator.calculateTotalGrade(grades);
    
    if (!userGrades.has(measure.member_id) || totalGrade < userGrades.get(measure.member_id)) {
      userGrades.set(measure.member_id, totalGrade);
    }
  }

  // 4. 순위 계산 (등급 낮을수록 높은 순위)
  const myGrade = userGrades.get(memberId) || 4;
  let rank = 1;
  
  for (const [userId, grade] of userGrades.entries()) {
    if (userId !== memberId && grade < myGrade) {
      rank++;
    }
  }

  return rank;
}
```

---

### Step 3: RankService

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateAge, getAgeRange } from '../common/helpers/age-range.helper';

@Injectable()
export class RankService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 연령대 순위 조회
   */
  async getAgeGroupRank(memberId: number) {
    // 1. 사용자 정보 조회
    const member = await this.prisma.member.findUnique({
      where: { member_id: memberId },
    });

    if (!member) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const age = calculateAge(member.birth_date);
    const ageRange = getAgeRange(age);

    // 2. 사용자의 측정 기록 조회
    const myMeasures = await this.prisma.fitness_measure.findMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      orderBy: {
        measure_day: 'desc',
      },
      take: 10, // 최근 10개
    });

    if (!myMeasures || myMeasures.length === 0) {
      throw new NotFoundException({
        isSuccess: false,
        code: 'RANK301',
        message: '순위 계산을 위한 충분한 데이터가 없습니다.',
      });
    }

    // 3. 동년배 전체 데이터 조회
    const allMeasures = await this.prisma.fitness_measure.findMany({
      where: {
        gender: member.gender,
        age: {
          gte: ageRange.min,
          lte: ageRange.max,
        },
        deleted_yn: 'N',
      },
    });

    const totalPeople = new Set(allMeasures.map(m => m.member_id)).size;

    // 4. 현재 순위 계산
    const latestMeasure = myMeasures[0];
    const currentRank = await this.calculateCurrentRank(
      latestMeasure,
      allMeasures,
      memberId,
    );

    // 5. 순위 히스토리 계산
    const rankHistoryList = await Promise.all(
      myMeasures.map(async measure => ({
        rank: await this.calculateCurrentRank(measure, allMeasures, memberId),
        date: measure.measure_day.toISOString().split('T')[0],
      })),
    );

    // 6. 각 체력 항목별 순위
    const fitnessRankList = await this.calculateFitnessRanks(
      latestMeasure,
      allMeasures,
      memberId,
      totalPeople,
    );

    return {
      isSuccess: true,
      code: '200',
      data: {
        currentRank: {
          rank: currentRank,
          totalPeople,
          percentile: Math.round((currentRank / totalPeople) * 100),
        },
        rankHistoryList,
        fitnessRankList,
      },
    };
  }

  /**
   * 체력 등급 상세 히스토리
   */
  async getGradeHistory(memberId: number) {
    const measures = await this.prisma.fitness_measure.findMany({
      where: {
        member_id: memberId,
        deleted_yn: 'N',
      },
      orderBy: {
        measure_day: 'desc',
      },
    });

    if (!measures || measures.length === 0) {
      throw new NotFoundException({
        isSuccess: false,
        code: 'FITNESS302',
        message: '체력 측정 기록이 존재하지 않습니다.',
      });
    }

    // 각 체력 항목별로 그룹화
    const totalGradeList = [];
    const strengthGradeList = [];
    const cardioGradeList = [];
    const enduranceGradeList = [];
    const flexibilityGradeList = [];
    const agilityGradeList = [];
    const quicknessGradeList = [];

    for (const measure of measures) {
      const date = measure.measure_day.toISOString().split('T')[0];
      const fitnessResult = measure.fitness_result as any;

      // 종합 등급
      const grades = Object.values(fitnessResult).map((data: any) => data.grade);
      const totalGrade = Math.round(
        grades.reduce((a: number, b: number) => a + b, 0) / grades.length,
      );
      totalGradeList.push({ grade: totalGrade, date });

      // 각 항목별 등급
      if (fitnessResult.STRENGTH) {
        strengthGradeList.push({ grade: fitnessResult.STRENGTH.grade, date });
      }
      if (fitnessResult.CARDIO) {
        cardioGradeList.push({ grade: fitnessResult.CARDIO.grade, date });
      }
      if (fitnessResult.ENDURANCE) {
        enduranceGradeList.push({ grade: fitnessResult.ENDURANCE.grade, date });
      }
      if (fitnessResult.FLEXIBILITY) {
        flexibilityGradeList.push({ grade: fitnessResult.FLEXIBILITY.grade, date });
      }
      if (fitnessResult.AGILITY) {
        agilityGradeList.push({ grade: fitnessResult.AGILITY.grade, date });
      }
      if (fitnessResult.QUICKNESS) {
        quicknessGradeList.push({ grade: fitnessResult.QUICKNESS.grade, date });
      }
    }

    return {
      isSuccess: true,
      code: '200',
      data: {
        totalGradeList,
        strengthGradeList,
        cardioGradeList,
        enduranceGradeList,
        flexibilityGradeList,
        agilityGradeList,
        quicknessGradeList,
      },
    };
  }

  /**
   * 현재 순위 계산 (Helper)
   */
  private async calculateCurrentRank(
    myMeasure: any,
    allMeasures: any[],
    memberId: number,
  ): Promise<number> {
    const myResult = myMeasure.fitness_result as any;
    const myGrades = Object.values(myResult).map((data: any) => data.grade);
    const myAvgGrade = myGrades.reduce((a, b) => a + b, 0) / myGrades.length;

    let rank = 1;
    const processedUsers = new Set<number>();

    for (const measure of allMeasures) {
      if (measure.member_id === memberId || processedUsers.has(measure.member_id)) {
        continue;
      }

      const result = measure.fitness_result as any;
      const grades = Object.values(result).map((data: any) => data.grade);
      const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;

      if (avgGrade < myAvgGrade) {
        rank++;
      }

      processedUsers.add(measure.member_id);
    }

    return rank;
  }

  /**
   * 각 체력 항목별 순위 계산
   */
  private async calculateFitnessRanks(
    myMeasure: any,
    allMeasures: any[],
    memberId: number,
    totalPeople: number,
  ) {
    const myResult = myMeasure.fitness_result as any;
    const fitnessRankList = [];

    for (const [type, myData] of Object.entries(myResult)) {
      let rank = 1;
      const processedUsers = new Set<number>();

      for (const measure of allMeasures) {
        if (measure.member_id === memberId || processedUsers.has(measure.member_id)) {
          continue;
        }

        const result = measure.fitness_result as any;
        if (result[type] && result[type].grade < myData.grade) {
          rank++;
        }

        processedUsers.add(measure.member_id);
      }

      fitnessRankList.push({
        type,
        rank,
        percentile: Math.round((rank / totalPeople) * 100),
      });
    }

    return fitnessRankList;
  }
}
```

---

### Step 4: Controllers

#### FitnessController
```typescript
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FitnessService } from './fitness.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateFitnessMeasureDto } from './dto/create-fitness-measure.dto';
import { QueryFitnessDto } from './dto/query-fitness.dto';

@Controller('fitness')
@UseGuards(JwtAuthGuard)
export class FitnessController {
  constructor(private readonly fitnessService: FitnessService) {}

  @Post()
  async createFitnessMeasure(
    @GetUser('id') memberId: number,
    @Body() dto: CreateFitnessMeasureDto,
  ) {
    return this.fitnessService.createFitnessMeasure(memberId, dto);
  }

  @Get('measure-days')
  async getMeasureDays(@GetUser('id') memberId: number) {
    return this.fitnessService.getMeasureDays(memberId);
  }

  @Get()
  async getFitnessChart(
    @GetUser('id') memberId: number,
    @Query() query: QueryFitnessDto,
  ) {
    return this.fitnessService.getFitnessChart(memberId, query.measureDay);
  }

  @Get('grade')
  async getGradeHistory(@GetUser('id') memberId: number) {
    return this.fitnessService.getGradeHistory(memberId);
  }

  @Get('recommend')
  async getRecommendation(@GetUser('id') memberId: number) {
    return this.recommendationService.getRecommendation(memberId);
  }
}
```

#### RankController
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RankService } from './rank.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('rank')
@UseGuards(JwtAuthGuard)
export class RankController {
  constructor(private readonly rankService: RankService) {}

  @Get('age-group')
  async getAgeGroupRank(@GetUser('id') memberId: number) {
    return this.rankService.getAgeGroupRank(memberId);
  }

  @Get('history')
  async getGradeHistory(@GetUser('id') memberId: number) {
    return this.rankService.getGradeHistory(memberId);
  }
}
```

---

## 에러 코드

### Fitness 관련
| 코드 | 메시지 | 상황 |
|------|--------|------|
| FITNESS301 | 체력 측정은 하루에 1번만 가능합니다 | 중복 측정 |
| FITNESS302 | 체력 측정 기록이 존재하지 않습니다 | 조회 실패 |
| FITNESS303 | 필수 측정 항목이 누락되었습니다 | 필드 누락 |
| FITNESS304 | 근력 측정 필드 오류 | 푸시업 필드 개수 |
| FITNESS305 | 사용자 정보가 완전하지 않습니다 | 프로필 미완성 |
| FITNESS306 | 날짜 형식이 올바르지 않습니다 | 잘못된 형식 |

### Rank 관련
| 코드 | 메시지 | 상황 |
|------|--------|------|
| RANK301 | 순위 계산을 위한 충분한 데이터가 없습니다 | 데이터 부족 |

### Recommendation 관련
| 코드 | 메시지 | 상황 |
|------|--------|------|
| RECOMMEND301 | 최근 체력 측정 기록이 없습니다 | 측정 필요 |
| RECOMMEND302 | 운동 목표 및 장소 정보가 설정되지 않았습니다 | 설정 필요 |

---

## 테스트 시나리오

### 1. 체력 측정 플로우
```
1. POST /api/fitness - 측정 등록
2. GET /api/fitness/measure-days - 날짜 목록 확인
3. GET /api/fitness?measureDay=2025-02-07 - 6각형 차트 조회
4. GET /api/rank/age-group - 순위 확인
```

### 2. 히스토리 조회
```
1. GET /api/fitness/grade - 간단 히스토리
2. GET /api/rank/history - 상세 히스토리
```

### 3. 운동 추천
```
1. GET /api/fitness/recommend - AI 추천 받기
```

---

## 🎉 완료!

전체 API 명세가 완성되었습니다! 이제 구현만 하면 됩니다! 😊