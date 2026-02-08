# 🔐 Beeve 인증 API 구현 가이드

## 📋 목차
1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [API 명세](#api-명세)
4. [프로젝트 구조](#프로젝트-구조)
5. [단계별 구현](#단계별-구현)
6. [환경변수 설정](#환경변수-설정)
7. [테스트 시나리오](#테스트-시나리오)
8. [에러 코드 정리](#에러-코드-정리)

---

## 개요

### 구현할 기능
- ✅ 소셜 로그인 (Google, Kakao, Apple)
- ✅ 휴대폰 인증 (SMS)
- ✅ JWT 기반 인증 (Access Token + Refresh Token)
- ✅ 회원가입 / 로그인 / 로그아웃
- ✅ 토큰 재발급

### 인증 플로우
```
1. 소셜 로그인 (프론트엔드에서 처리)
   ↓
2. 휴대폰 인증번호 요청 (SMS 발송)
   ↓
3. 휴대폰 인증번호 확인
   ↓
4. 회원가입 (providerUserId + phoneNumber + verificationToken)
   ↓
5. Access Token + Refresh Token 발급
```

---

## 기술 스택

### 백엔드
- **NestJS**: Node.js 프레임워크
- **Prisma**: ORM (PostgreSQL)
- **@upstash/redis**: Redis 클라이언트 (휴대폰 인증)
- **@nestjs/jwt**: JWT 토큰 생성/검증
- **@nestjs/passport**: 인증 전략
- **class-validator**: DTO 검증

### 외부 서비스
- **Supabase**: PostgreSQL 데이터베이스 (Seoul)
- **Upstash Redis**: 인메모리 캐시 (Tokyo/Global)
- **SMS 서비스**: Solapi, AWS SNS, 또는 NCP SENS

---

## API 명세

### 1. 휴대폰 인증번호 요청
```
POST /api/auth/phone/send-code
```

**Request Body**
```json
{
  "phoneNumber": "01012345678"
}
```

**Response Success (200)**
```json
{
  "isSuccess": true,
  "code": "200",
  "message": "인증번호가 발송되었습니다.",
  "data": {
    "expiresAt": "2025-02-07T15:35:00Z",
    "remainingAttempts": 3
  }
}
```

**Response Error**
```json
// 잘못된 전화번호 형식
{
  "isSuccess": false,
  "code": "AUTH201",
  "message": "유효하지 않은 전화번호 형식입니다."
}

// 1분 제한
{
  "isSuccess": false,
  "code": "AUTH202",
  "message": "1분 후에 다시 시도해주세요."
}

// 일일 발송 한도 초과
{
  "isSuccess": false,
  "code": "AUTH203",
  "message": "일일 인증번호 발송 한도를 초과했습니다."
}
```

---

### 2. 휴대폰 인증번호 확인
```
POST /api/auth/phone/verify-code
```

**Request Body**
```json
{
  "phoneNumber": "01012345678",
  "code": "123456"
}
```

**Response Success (200)**
```json
{
  "isSuccess": true,
  "code": "200",
  "message": "인증되었습니다.",
  "data": {
    "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "phoneNumber": "01012345678"
  }
}
```

**Response Error**
```json
// 인증번호 불일치
{
  "isSuccess": false,
  "code": "AUTH205",
  "message": "인증번호가 일치하지 않습니다.",
  "data": {
    "remainingAttempts": 2
  }
}

// 인증번호 만료
{
  "isSuccess": false,
  "code": "AUTH206",
  "message": "인증번호가 만료되었습니다. 다시 요청해주세요."
}

// 시도 횟수 초과
{
  "isSuccess": false,
  "code": "AUTH207",
  "message": "인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요."
}
```

---

### 3. 회원가입
```
POST /api/auth/signup
```

**Request Body**
```json
{
  "provider": "GOOGLE",
  "providerUserId": "de234",
  "name": "홍길동",
  "email": "asdf@apple.com",
  "profileUrl": "asdf...",
  "gender": "F",
  "birthDate": "2000-01-01",
  "height": 166.12,
  "weight": 56.33,
  "phoneNumber": "01012345678",
  "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Success (200)**
```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "accessToken": "Bearer ...",
    "refreshToken": "Bearer ...",
    "name": "홍길동",
    "profileUrl": "asdf…"
  }
}
```

**Response Error**
```json
// 휴대폰 인증 미완료
{
  "isSuccess": false,
  "code": "AUTH209",
  "message": "휴대폰 인증이 필요합니다."
}

// 인증 토큰 만료
{
  "isSuccess": false,
  "code": "AUTH210",
  "message": "인증 토큰이 만료되었습니다. 휴대폰 인증을 다시 진행해주세요."
}

// 이미 가입된 사용자
{
  "isSuccess": false,
  "code": "AUTH101",
  "message": "이미 가입된 사용자입니다."
}

// 이미 가입된 전화번호
{
  "isSuccess": false,
  "code": "AUTH212",
  "message": "이미 가입된 전화번호입니다."
}
```

---

### 4. 로그인
```
POST /api/auth/login
```

**Request Body**
```json
{
  "provider": "GOOGLE",
  "providerUserId": "de234"
}
```

**Response Success (200)**
```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "accessToken": "Bearer ...",
    "refreshToken": "Bearer ...",
    "name": "홍길동",
    "profileUrl": "asdf…"
  }
}
```

**Response Error**
```json
{
  "isSuccess": false,
  "code": "AUTH102",
  "message": "가입되지 않은 사용자입니다."
}
```

---

### 5. Access Token 재발급
```
POST /api/auth/refresh
```

**Request Body**
```json
{
  "refreshToken": "Bearer ..."
}
```

**Response Success (200)**
```json
{
  "isSuccess": true,
  "code": "200",
  "data": {
    "accessToken": "Bearer ..."
  }
}
```

**Response Error**
```json
{
  "isSuccess": false,
  "code": "AUTH103",
  "message": "리프레시 토큰이 존재하지 않습니다."
}

{
  "isSuccess": false,
  "code": "AUTH104",
  "message": "리프레시 토큰이 일치하지 않습니다."
}

{
  "isSuccess": false,
  "code": "AUTH105",
  "message": "리프레시 토큰이 만료되었습니다."
}
```

---

### 6. 로그아웃
```
POST /api/auth/logout
```

**Request Header**
```
Authorization: Bearer [accessToken]
```

**Request Body**
```json
{
  "refreshToken": "Bearer ..."
}
```

**Response Success (200)**
```json
{
  "isSuccess": true,
  "code": "200"
}
```

---

## 프로젝트 구조

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   │   ├── send-code.dto.ts
│   │   ├── verify-code.dto.ts
│   │   ├── signup.dto.ts
│   │   ├── login.dto.ts
│   │   ├── refresh-token.dto.ts
│   │   └── logout.dto.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── interfaces/
│       └── jwt-payload.interface.ts
├── phone-verification/
│   ├── phone-verification.module.ts
│   └── phone-verification.service.ts
├── sms/
│   ├── sms.module.ts
│   └── sms.service.ts
├── redis/
│   ├── redis.module.ts
│   └── redis.service.ts (선택사항)
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── response.interceptor.ts
│   └── decorators/
│       └── current-user.decorator.ts
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts
```

---

## 단계별 구현

### Step 1: 필요한 패키지 설치

```bash
# JWT 관련
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt

# Redis (이미 설치됨)
# npm install @upstash/redis

# 검증 관련
npm install class-validator class-transformer

# SMS 서비스 (Solapi 예시)
npm install solapi
```

---

### Step 2: 환경변수 설정

**.env**
```bash
# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Redis
UPSTASH_REDIS_REST_URL="https://[YOUR-DB].upstash.io"
UPSTASH_REDIS_REST_TOKEN="[YOUR-TOKEN]"

# JWT
JWT_ACCESS_SECRET="your-access-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# SMS (Solapi 예시)
SMS_API_KEY="your-solapi-api-key"
SMS_API_SECRET="your-solapi-api-secret"
SMS_SENDER="01012345678"

# 개발 환경
NODE_ENV="development"
```

---

### Step 3: Redis Module 구성

**redis.module.ts**
```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis({
          url: configService.get('UPSTASH_REDIS_REST_URL'),
          token: configService.get('UPSTASH_REDIS_REST_TOKEN'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

**app.module.ts에 추가**
```typescript
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule, // 추가
    // ... 다른 모듈
  ],
})
export class AppModule {}
```

---

### Step 4: Phone Verification Service

**phone-verification.service.ts**
```typescript
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Redis } from '@upstash/redis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class PhoneVerificationService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 인증번호 생성 (6자리 숫자)
   */
  private generateCode(): string {
    // 개발 환경에서는 고정값 사용
    if (this.configService.get('NODE_ENV') === 'development') {
      return '123456';
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 전화번호 유효성 검증
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // 한국 전화번호 형식: 010-XXXX-XXXX 또는 01XXXXXXXXX
    const phoneRegex = /^01[0-9]{8,9}$/;
    return phoneRegex.test(phoneNumber.replace(/-/g, ''));
  }

  /**
   * 발송 제한 체크 (1분에 1회)
   */
  async checkRateLimit(phoneNumber: string): Promise<boolean> {
    const key = `phone_ratelimit:${phoneNumber}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      return false; // 제한 중
    }

    // 1분(60초) 동안 재발송 불가
    await this.redis.setex(key, 60, '1');
    return true; // 발송 가능
  }

  /**
   * 일일 발송 제한 체크 (하루 5회)
   */
  async checkDailyLimit(phoneNumber: string): Promise<boolean> {
    const key = `phone_daily:${phoneNumber}`;
    const count = await this.redis.get(key);

    if (count && Number(count) >= 5) {
      return false; // 제한 초과
    }

    const currentCount = count ? Number(count) + 1 : 1;

    // 자정까지 남은 시간 계산
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);

    await this.redis.setex(key, ttl, String(currentCount));
    return true; // 발송 가능
  }

  /**
   * 인증번호 저장 (5분 TTL)
   */
  async saveVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const key = `phone_verify:${phoneNumber}`;
    const data = {
      code,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    // 5분(300초) 후 자동 삭제
    await this.redis.setex(key, 300, JSON.stringify(data));
  }

  /**
   * 인증번호 조회
   */
  async getVerificationCode(phoneNumber: string): Promise<any> {
    const key = `phone_verify:${phoneNumber}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  /**
   * 시도 횟수 증가
   */
  async incrementAttempts(phoneNumber: string): Promise<number> {
    const key = `phone_verify:${phoneNumber}`;
    const data = await this.getVerificationCode(phoneNumber);

    if (!data) {
      return 0;
    }

    data.attempts += 1;

    // TTL 유지하면서 업데이트
    const ttl = await this.redis.ttl(key);
    await this.redis.setex(key, ttl, JSON.stringify(data));

    return data.attempts;
  }

  /**
   * 인증 완료 후 삭제
   */
  async deleteVerificationCode(phoneNumber: string): Promise<void> {
    const key = `phone_verify:${phoneNumber}`;
    await this.redis.del(key);
  }

  /**
   * Verification Token 생성 (10분 유효)
   */
  generateVerificationToken(phoneNumber: string): string {
    const payload = {
      phoneNumber,
      purpose: 'phone_verification',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '10m',
    });
  }

  /**
   * Verification Token 검증
   */
  async verifyToken(phoneNumber: string, token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });

      return payload.phoneNumber === phoneNumber && payload.purpose === 'phone_verification';
    } catch (error) {
      return false;
    }
  }
}
```

**phone-verification.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PhoneVerificationService } from './phone-verification.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [PhoneVerificationService],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
```

---

### Step 5: SMS Service

**sms.service.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Solapi 사용 예시
// import { SolapiMessageService } from 'solapi';

@Injectable()
export class SmsService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * SMS 발송
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // 개발 환경에서는 실제 발송하지 않음
      if (this.configService.get('NODE_ENV') === 'development') {
        console.log(`📱 SMS to ${phoneNumber}: ${message}`);
        return true;
      }

      // TODO: 실제 SMS 발송 로직 구현
      // Solapi 예시:
      /*
      const messageService = new SolapiMessageService(
        this.configService.get('SMS_API_KEY'),
        this.configService.get('SMS_API_SECRET'),
      );

      await messageService.send({
        to: phoneNumber,
        from: this.configService.get('SMS_SENDER'),
        text: message,
      });
      */

      return true;
    } catch (error) {
      console.error('SMS 발송 실패:', error);
      return false;
    }
  }

  /**
   * 인증번호 SMS 발송
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
    const message = `[Beeve] 인증번호는 [${code}]입니다. 5분 이내에 입력해주세요.`;
    return this.sendSms(phoneNumber, message);
  }
}
```

**sms.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
```

---

### Step 6: DTO 정의

**dto/send-code.dto.ts**
```typescript
import { IsString, Matches } from 'class-validator';

export class SendCodeDto {
  @IsString()
  @Matches(/^01[0-9]{8,9}$/, {
    message: '유효하지 않은 전화번호 형식입니다.',
  })
  phoneNumber: string;
}
```

**dto/verify-code.dto.ts**
```typescript
import { IsString, Matches, Length } from 'class-validator';

export class VerifyCodeDto {
  @IsString()
  @Matches(/^01[0-9]{8,9}$/, {
    message: '유효하지 않은 전화번호 형식입니다.',
  })
  phoneNumber: string;

  @IsString()
  @Length(6, 6, { message: '인증번호는 6자리입니다.' })
  code: string;
}
```

**dto/signup.dto.ts**
```typescript
import { 
  IsString, 
  IsEmail, 
  IsIn, 
  IsDateString, 
  IsNumber, 
  IsOptional,
  Matches,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @IsIn(['GOOGLE', 'KAKAO', 'APPLE'])
  provider: string;

  @IsString()
  providerUserId: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  profileUrl?: string;

  @IsString()
  @IsIn(['M', 'F'])
  gender: string;

  @IsDateString()
  birthDate: string;

  @IsNumber()
  height: number;

  @IsNumber()
  weight: number;

  @IsString()
  @Matches(/^01[0-9]{8,9}$/, {
    message: '유효하지 않은 전화번호 형식입니다.',
  })
  phoneNumber: string;

  @IsString()
  verificationToken: string;
}
```

**dto/login.dto.ts**
```typescript
import { IsString, IsIn } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsIn(['GOOGLE', 'KAKAO', 'APPLE'])
  provider: string;

  @IsString()
  providerUserId: string;
}
```

**dto/refresh-token.dto.ts**
```typescript
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
```

**dto/logout.dto.ts**
```typescript
import { IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  refreshToken: string;
}
```

---

### Step 7: Auth Service

**auth.service.ts** (Part 1 - 휴대폰 인증)
```typescript
import { 
  Injectable, 
  BadRequestException, 
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PhoneVerificationService } from '../phone-verification/phone-verification.service';
import { SmsService } from '../sms/sms.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly phoneVerificationService: PhoneVerificationService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * 휴대폰 인증번호 발송
   */
  async sendVerificationCode(dto: SendCodeDto) {
    const { phoneNumber } = dto;

    // 전화번호 유효성 검증
    if (!this.phoneVerificationService.validatePhoneNumber(phoneNumber)) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH201',
        message: '유효하지 않은 전화번호 형식입니다.',
      });
    }

    // 1분 제한 체크
    const canSend = await this.phoneVerificationService.checkRateLimit(phoneNumber);
    if (!canSend) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH202',
        message: '1분 후에 다시 시도해주세요.',
      });
    }

    // 일일 발송 한도 체크
    const withinDailyLimit = await this.phoneVerificationService.checkDailyLimit(phoneNumber);
    if (!withinDailyLimit) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH203',
        message: '일일 인증번호 발송 한도를 초과했습니다.',
      });
    }

    // 인증번호 생성
    const code = this.phoneVerificationService['generateCode']();

    // SMS 발송
    const smsSent = await this.smsService.sendVerificationCode(phoneNumber, code);
    if (!smsSent) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH204',
        message: '인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.',
      });
    }

    // Redis에 저장
    await this.phoneVerificationService.saveVerificationCode(phoneNumber, code);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후

    return {
      isSuccess: true,
      code: '200',
      message: '인증번호가 발송되었습니다.',
      data: {
        expiresAt: expiresAt.toISOString(),
        remainingAttempts: 3,
      },
    };
  }

  /**
   * 휴대폰 인증번호 확인
   */
  async verifyCode(dto: VerifyCodeDto) {
    const { phoneNumber, code } = dto;

    // Redis에서 인증 정보 조회
    const verificationData = await this.phoneVerificationService.getVerificationCode(phoneNumber);

    if (!verificationData) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH208',
        message: '인증번호 발송 내역이 없습니다.',
      });
    }

    // 시도 횟수 체크 (5회 제한)
    if (verificationData.attempts >= 5) {
      await this.phoneVerificationService.deleteVerificationCode(phoneNumber);
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH207',
        message: '인증 시도 횟수를 초과했습니다. 새로운 인증번호를 요청해주세요.',
      });
    }

    // 인증번호 불일치
    if (verificationData.code !== code) {
      const attempts = await this.phoneVerificationService.incrementAttempts(phoneNumber);
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH205',
        message: '인증번호가 일치하지 않습니다.',
        data: {
          remainingAttempts: 5 - attempts,
        },
      });
    }

    // 인증 성공 - Verification Token 생성
    const verificationToken = this.phoneVerificationService.generateVerificationToken(phoneNumber);

    // 인증번호 삭제
    await this.phoneVerificationService.deleteVerificationCode(phoneNumber);

    return {
      isSuccess: true,
      code: '200',
      message: '인증되었습니다.',
      data: {
        verificationToken,
        phoneNumber,
      },
    };
  }
}
```

**auth.service.ts** (Part 2 - 회원가입/로그인)
```typescript
  /**
   * 회원가입
   */
  async signup(dto: SignupDto) {
    const { 
      provider, 
      providerUserId, 
      phoneNumber, 
      verificationToken,
      email,
      name,
      gender,
      birthDate,
      height,
      weight,
      profileUrl,
    } = dto;

    // Verification Token 검증
    const isValidToken = await this.phoneVerificationService.verifyToken(
      phoneNumber, 
      verificationToken
    );

    if (!isValidToken) {
      throw new BadRequestException({
        isSuccess: false,
        code: 'AUTH210',
        message: '인증 토큰이 만료되었습니다. 휴대폰 인증을 다시 진행해주세요.',
      });
    }

    // 이미 가입된 사용자 확인 (provider + providerUserId)
    const existingUser = await this.prisma.social_auth.findFirst({
      where: {
        provider,
        provider_user_id: providerUserId,
        deleted_yn: 'N',
      },
      include: {
        member: true,
      },
    });

    if (existingUser) {
      throw new ConflictException({
        isSuccess: false,
        code: 'AUTH101',
        message: '이미 가입된 사용자입니다.',
      });
    }

    // 이미 가입된 전화번호 확인
    const existingPhone = await this.prisma.member.findFirst({
      where: {
        phone_number: phoneNumber,
        deleted_yn: 'N',
      },
    });

    if (existingPhone) {
      throw new ConflictException({
        isSuccess: false,
        code: 'AUTH212',
        message: '이미 가입된 전화번호입니다.',
      });
    }

    // BMI 계산
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // 회원 생성
    const member = await this.prisma.member.create({
      data: {
        email,
        name,
        gender,
        birth_date: new Date(birthDate),
        height,
        weight,
        bmi: parseFloat(bmi.toFixed(2)),
        profile_url: profileUrl,
        phone_number: phoneNumber,
        social_auth: {
          create: {
            provider,
            provider_user_id: providerUserId,
          },
        },
      },
    });

    // 토큰 생성
    const tokens = await this.generateTokens(member.member_id);

    // Refresh Token 저장
    await this.saveRefreshToken(member.member_id, tokens.refreshToken);

    return {
      isSuccess: true,
      code: '200',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        name: member.name,
        profileUrl: member.profile_url,
      },
    };
  }

  /**
   * 로그인
   */
  async login(dto: LoginDto) {
    const { provider, providerUserId } = dto;

    // 소셜 인증 정보로 사용자 조회
    const socialAuth = await this.prisma.social_auth.findFirst({
      where: {
        provider,
        provider_user_id: providerUserId,
        deleted_yn: 'N',
      },
      include: {
        member: true,
      },
    });

    if (!socialAuth || socialAuth.member.deleted_yn === 'Y') {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH102',
        message: '가입되지 않은 사용자입니다.',
      });
    }

    const member = socialAuth.member;

    // 토큰 생성
    const tokens = await this.generateTokens(member.member_id);

    // Refresh Token 저장 (기존 것 덮어쓰기)
    await this.saveRefreshToken(member.member_id, tokens.refreshToken);

    return {
      isSuccess: true,
      code: '200',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        name: member.name,
        profileUrl: member.profile_url,
      },
    };
  }

  /**
   * 토큰 재발급
   */
  async refresh(refreshToken: string) {
    // Bearer 제거
    const token = refreshToken.replace('Bearer ', '');

    // 토큰 검증
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH105',
        message: '리프레시 토큰이 만료되었습니다.',
      });
    }

    // DB에서 Refresh Token 조회
    const storedToken = await this.prisma.refresh_token.findFirst({
      where: {
        member_id: payload.sub,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH103',
        message: '리프레시 토큰이 존재하지 않습니다.',
      });
    }

    if (storedToken.token !== token) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH104',
        message: '리프레시 토큰이 일치하지 않습니다.',
      });
    }

    // 새 Access Token 생성
    const accessToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
      },
    );

    return {
      isSuccess: true,
      code: '200',
      data: {
        accessToken: `Bearer ${accessToken}`,
      },
    };
  }

  /**
   * 로그아웃
   */
  async logout(memberId: number, refreshToken: string) {
    const token = refreshToken.replace('Bearer ', '');

    // DB에서 Refresh Token 조회
    const storedToken = await this.prisma.refresh_token.findFirst({
      where: {
        member_id: memberId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH103',
        message: '리프레시 토큰이 존재하지 않습니다.',
      });
    }

    if (storedToken.token !== token) {
      throw new UnauthorizedException({
        isSuccess: false,
        code: 'AUTH104',
        message: '리프레시 토큰이 일치하지 않습니다.',
      });
    }

    // Refresh Token 삭제
    await this.prisma.refresh_token.delete({
      where: {
        refresh_token_id: storedToken.refresh_token_id,
      },
    });

    return {
      isSuccess: true,
      code: '200',
    };
  }

  /**
   * 토큰 생성 (Access + Refresh)
   */
  private async generateTokens(memberId: number) {
    const payload = { sub: memberId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
    });

    return {
      accessToken: `Bearer ${accessToken}`,
      refreshToken: `Bearer ${refreshToken}`,
    };
  }

  /**
   * Refresh Token 저장
   */
  private async saveRefreshToken(memberId: number, refreshToken: string) {
    const token = refreshToken.replace('Bearer ', '');

    // 기존 토큰 삭제
    await this.prisma.refresh_token.deleteMany({
      where: { member_id: memberId },
    });

    // 새 토큰 저장
    await this.prisma.refresh_token.create({
      data: {
        member_id: memberId,
        token,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
}
```

---

### Step 8: Auth Controller

**auth.controller.ts**
```typescript
import { 
  Controller, 
  Post, 
  Body, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 휴대폰 인증번호 발송
   */
  @Post('phone/send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendVerificationCode(dto);
  }

  /**
   * 휴대폰 인증번호 확인
   */
  @Post('phone/verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  /**
   * 회원가입
   */
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * 로그인
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Access Token 재발급
   */
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * 로그아웃
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req, @Body() dto: LogoutDto) {
    return this.authService.logout(req.user.sub, dto.refreshToken);
  }
}
```

---

### Step 9: JWT Strategy & Guard

**strategies/jwt.strategy.ts**
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    const member = await this.prisma.member.findUnique({
      where: { member_id: payload.sub },
    });

    if (!member || member.deleted_yn === 'Y') {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    return { sub: payload.sub };
  }
}
```

**guards/jwt-auth.guard.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

---

### Step 10: Auth Module

**auth.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PhoneVerificationModule } from '../phone-verification/phone-verification.module';
import { SmsModule } from '../sms/sms.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // 설정은 서비스에서 동적으로 처리
    PhoneVerificationModule,
    SmsModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

### Step 11: Prisma Schema 업데이트

**schema.prisma**에 phone_number 컬럼 추가 확인:

```prisma
model member {
  member_id       BigInt   @id @default(autoincrement())
  email           String   @db.VarChar
  name            String?  @db.VarChar
  birth_date      DateTime? @db.Date
  gender          String   @db.VarChar
  height          Decimal? @db.Decimal
  weight          Decimal? @db.Decimal
  bmi             Decimal? @db.Decimal
  profile_url     String?
  phone_number    String?  @unique @db.VarChar(20)  // 추가!
  withdraw_reason String?  @db.VarChar
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  updated_at      DateTime @default(now()) @db.Timestamptz(6)
  deleted_yn      String   @default("N") @db.VarChar
  
  // ... relations
}
```

DB에 적용:
```bash
npx prisma db push
```

---

## 테스트 시나리오

### 1. 휴대폰 인증 플로우

**Step 1: 인증번호 발송**
```bash
curl -X POST http://localhost:3000/api/auth/phone/send-code \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "01012345678"
  }'
```

**Step 2: 인증번호 확인 (개발 환경에서는 123456)**
```bash
curl -X POST http://localhost:3000/api/auth/phone/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "01012345678",
    "code": "123456"
  }'
```

### 2. 회원가입

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GOOGLE",
    "providerUserId": "google123",
    "name": "홍길동",
    "email": "test@example.com",
    "gender": "M",
    "birthDate": "1990-01-01",
    "height": 175.5,
    "weight": 70.0,
    "phoneNumber": "01012345678",
    "verificationToken": "[Step2에서 받은 토큰]"
  }'
```

### 3. 로그인

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GOOGLE",
    "providerUserId": "google123"
  }'
```

### 4. 토큰 재발급

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "Bearer [refreshToken]"
  }'
```

### 5. 로그아웃

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [accessToken]" \
  -d '{
    "refreshToken": "Bearer [refreshToken]"
  }'
```

---

## 에러 코드 정리

| 코드 | 메시지 | 설명 |
|------|--------|------|
| AUTH101 | 이미 가입된 사용자입니다. | provider + providerUserId 중복 |
| AUTH102 | 가입되지 않은 사용자입니다. | 로그인 시 사용자 없음 |
| AUTH103 | 리프레시 토큰이 존재하지 않습니다. | DB에 토큰 없음 |
| AUTH104 | 리프레시 토큰이 일치하지 않습니다. | 토큰 불일치 |
| AUTH105 | 리프레시 토큰이 만료되었습니다. | 토큰 만료 |
| AUTH201 | 유효하지 않은 전화번호 형식입니다. | 전화번호 형식 오류 |
| AUTH202 | 1분 후에 다시 시도해주세요. | 발송 제한 (1분) |
| AUTH203 | 일일 인증번호 발송 한도를 초과했습니다. | 일일 한도 (5회) |
| AUTH204 | 인증번호 발송에 실패했습니다. | SMS 발송 실패 |
| AUTH205 | 인증번호가 일치하지 않습니다. | 코드 불일치 |
| AUTH206 | 인증번호가 만료되었습니다. | 5분 경과 |
| AUTH207 | 인증 시도 횟수를 초과했습니다. | 5회 시도 초과 |
| AUTH208 | 인증번호 발송 내역이 없습니다. | 발송 기록 없음 |
| AUTH209 | 휴대폰 인증이 필요합니다. | 인증 토큰 없음 |
| AUTH210 | 인증 토큰이 만료되었습니다. | 10분 경과 |
| AUTH211 | 인증 정보가 일치하지 않습니다. | 토큰-전화번호 불일치 |
| AUTH212 | 이미 가입된 전화번호입니다. | 전화번호 중복 |

---

## 다음 단계

1. ✅ **SMS 서비스 연동** (Solapi, AWS SNS, NCP SENS 중 선택)
2. ✅ **프론트엔드 연동 테스트**
3. ✅ **Swagger 문서 추가** (@nestjs/swagger)
4. ✅ **Rate Limiting 추가** (@nestjs/throttler)
5. ✅ **로깅 시스템 구축** (Winston)
6. ✅ **에러 핸들링 개선** (Global Exception Filter)
7. ✅ **배포 준비** (환경변수 분리, Docker)

---

## 보안 체크리스트

- [ ] JWT Secret은 강력한 랜덤 문자열 사용
- [ ] 환경변수는 .env에서 관리 (Git에 커밋 X)
- [ ] HTTPS 사용 (프로덕션)
- [ ] CORS 설정
- [ ] Rate Limiting 적용
- [ ] SQL Injection 방지 (Prisma 사용으로 자동 방지)
- [ ] XSS 방지 (helmet 미들웨어)
- [ ] 민감한 정보 로깅 금지

---

## 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Upstash Redis 문서](https://upstash.com/docs/redis)
- [JWT 베스트 프랙티스](https://tools.ietf.org/html/rfc8725)

---

**작성일**: 2025-02-07  
**버전**: 1.0.0  
**작성자**: Beeve Team