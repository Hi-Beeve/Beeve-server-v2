# Beeve Server v2

Beeve 웹 MVP용 백엔드 API 서버

## 기술 스택

- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Cache**: Upstash Redis
- **Authentication**: JWT (Access Token + Refresh Token)
- **AI**: Google Gemini API
- **Logging**: Winston
- **API Documentation**: Swagger
- **Container**: Docker

## 프로젝트 구조

```
src/
├── auth/           # 인증 모듈
├── members/        # 회원 모듈
├── fitness/        # 체력측정 모듈
├── rank/           # 순위 모듈
├── exercise/       # 운동 모듈
├── sms/            # SMS 모듈
├── redis/          # Redis 모듈
├── health/         # Health check 모듈
├── common/         # 공통 (filters, interceptors, guards, decorators, services)
├── config/         # 설정
└── prisma/         # Prisma 서비스
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- npm 9+
- PostgreSQL 15+ (또는 Supabase)

### 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에서 필요한 값들을 설정하세요

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev
```

### 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

### Docker로 실행

```bash
# 빌드 및 실행
docker-compose up -d

# 로컬 PostgreSQL과 함께 실행
docker-compose --profile local up -d
```

## API 문서

서버 실행 후 다음 URL에서 Swagger 문서를 확인할 수 있습니다:
- http://localhost:3000/api/docs

## 주요 엔드포인트

### Auth (인증)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/auth/phone/send-code | 휴대폰 인증번호 발송 | - |
| POST | /api/v1/auth/phone/verify-code | 휴대폰 인증번호 확인 | - |
| POST | /api/v1/auth/signup | 회원가입 | - |
| POST | /api/v1/auth/login | 로그인 | - |
| POST | /api/v1/auth/refresh | 토큰 재발급 | - |
| POST | /api/v1/auth/logout | 로그아웃 | Required |

#### 로그인/회원가입 응답 형식
```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "accessToken": "Bearer xxx",
    "tokenType": "Bearer",
    "refreshToken": "Bearer xxx",
    "expiresIn": 3600,
    "scope": "read write",
    "refreshTokenExpiresIn": 604800,
    "name": "사용자 이름",
    "profileUrl": "프로필 URL"
  }
}
```

### Members (회원)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/members/me | 내 프로필 조회 | Required |

### Fitness (체력측정)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/v1/fitness | 체력 측정 결과 등록 | Required |
| GET | /api/v1/fitness/measure-days | 측정 날짜 목록 조회 | Required |
| GET | /api/v1/fitness | 6각형 차트 조회 (날짜 미입력 시 최근 데이터) | Required |
| GET | /api/v1/fitness/grade | 등급 히스토리 조회 | Required |
| GET | /api/v1/fitness/recommend | AI 운동 추천 | Required |

#### 측정 날짜 목록 조회 응답 형식
```json
{
  "measureDates": ["2026-02-10", "2026-02-09", "2026-02-08"]
}
```
- 데이터가 없는 경우: `{ "measureDates": [] }` (200 OK)

#### 6각형 차트 조회
- `GET /api/v1/fitness` - 가장 최근 측정 데이터 반환
- `GET /api/v1/fitness?measureDay=2026-02-10` - 해당 날짜 데이터 반환
- 측정 기록이 없는 경우: `{ "data": null }` (200 OK)

### Rank (순위)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/rank/age-group | 연령대별 순위 조회 | Required |
| GET | /api/v1/rank/history | 순위 히스토리 조회 | Required |

### Health

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/health | 서버 상태 확인 | - |

## 환경변수

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | 서버 포트 | 3000 |
| NODE_ENV | 실행 환경 | development |
| DATABASE_URL | PostgreSQL 연결 URL | - |
| JWT_SECRET | JWT 시크릿 키 | - |
| JWT_ACCESS_SECRET | JWT 액세스 토큰 시크릿 키 | - |
| JWT_REFRESH_SECRET | JWT 리프레시 시크릿 키 | - |
| JWT_ACCESS_EXPIRATION | 액세스 토큰 만료시간 | 1h |
| JWT_REFRESH_EXPIRATION | 리프레시 토큰 만료시간 | 7d |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST URL | - |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST Token | - |
| GEMINI_API_KEY | Google Gemini API Key | - |

## 스크립트

```bash
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 실행
npm run start:dev      # 개발 모드 실행 (watch)
npm run start:debug    # 디버그 모드 실행
npm run lint           # ESLint 실행
npm run format         # Prettier 실행
npm run test           # 테스트 실행
npm run test:watch     # 테스트 watch 모드
npm run test:cov       # 테스트 커버리지
npm run test:e2e       # E2E 테스트
```

## 라이선스

Private
