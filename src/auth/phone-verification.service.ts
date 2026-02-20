import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Redis } from '@upstash/redis';
import { REDIS_CLIENT } from '../redis';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  private readonly isDevelopment: boolean;
  // 개발 환경용 메모리 저장소
  private readonly memoryStore = new Map<string, { data: string; expiresAt: number }>();

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    if (this.isDevelopment && !this.redis) {
      this.logger.warn('Redis not configured. Using in-memory store for development.');
    }
  }

  /**
   * 개발 환경용 메모리 저장
   */
  private memorySet(key: string, value: string, ttlSeconds: number): void {
    this.memoryStore.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * 개발 환경용 메모리 조회
   */
  private memoryGet(key: string): string | null {
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.data;
  }

  /**
   * 개발 환경용 메모리 삭제
   */
  private memoryDel(key: string): void {
    this.memoryStore.delete(key);
  }

  /**
   * 개발 환경용 TTL 조회
   */
  private memoryTtl(key: string): number {
    const item = this.memoryStore.get(key);
    if (!item) return -2;
    const remaining = Math.floor((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  /**
   * 개발 환경용 존재 여부
   */
  private memoryExists(key: string): boolean {
    return this.memoryGet(key) !== null;
  }

  /**
   * 인증번호 생성 (6자리 숫자)
   */
  generateCode(): string {
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
    const phoneRegex = /^01[0-9]{8,9}$/;
    return phoneRegex.test(phoneNumber.replace(/-/g, ''));
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
    if (this.redis) {
      await this.redis.setex(key, 300, JSON.stringify(data));
    } else {
      this.memorySet(key, JSON.stringify(data), 300);
    }
  }

  /**
   * 인증번호 조회
   */
  async getVerificationCode(phoneNumber: string): Promise<any> {
    const key = `phone_verify:${phoneNumber}`;
    let data: string | null;

    try {
      if (this.redis) {
        this.logger.debug(`Redis get: ${key}`);
        data = await this.redis.get(key);
      } else {
        this.logger.debug(`Memory get: ${key}`);
        data = this.memoryGet(key);
        this.logger.debug(`Memory result: ${data}`);
      }

      if (!data) return null;

      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      this.logger.error(`getVerificationCode error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 시도 횟수 증가
   */
  async incrementAttempts(phoneNumber: string): Promise<number> {
    const key = `phone_verify:${phoneNumber}`;
    const data = await this.getVerificationCode(phoneNumber);

    if (!data) return 0;

    data.attempts += 1;

    // TTL 유지하면서 업데이트
    if (this.redis) {
      const ttl = await this.redis.ttl(key);
      await this.redis.setex(key, ttl > 0 ? ttl : 300, JSON.stringify(data));
    } else {
      const ttl = this.memoryTtl(key);
      this.memorySet(key, JSON.stringify(data), ttl > 0 ? ttl : 300);
    }

    return data.attempts;
  }

  /**
   * 인증 완료 후 삭제
   */
  async deleteVerificationCode(phoneNumber: string): Promise<void> {
    const key = `phone_verify:${phoneNumber}`;
    if (this.redis) {
      await this.redis.del(key);
    } else {
      this.memoryDel(key);
    }
  }

  /**
   * 발송 제한 체크 (3분에 1회)
   */
  async checkRateLimit(phoneNumber: string): Promise<boolean> {
    const key = `phone_ratelimit:${phoneNumber}`;

    if (this.redis) {
      const exists = await this.redis.exists(key);
      if (exists) return false;
      await this.redis.setex(key, 180, '1');
    } else {
      if (this.memoryExists(key)) return false;
      this.memorySet(key, '1', 180);
    }

    return true;
  }

  /**
   * 일일 발송 제한 체크 (하루 5회)
   */
  async checkDailyLimit(phoneNumber: string): Promise<boolean> {
    const key = `phone_daily:${phoneNumber}`;
    let count: string | null;

    if (this.redis) {
      count = await this.redis.get(key);
    } else {
      count = this.memoryGet(key);
    }

    if (count && Number(count) >= 5) return false;

    const currentCount = count ? Number(count) + 1 : 1;

    // 자정까지 남은 시간 계산 (한국 시간 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // UTC+9
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstTomorrow = new Date(kstNow);
    kstTomorrow.setUTCHours(24, 0, 0, 0);
    const ttl = Math.floor((kstTomorrow.getTime() - kstNow.getTime()) / 1000);

    if (this.redis) {
      await this.redis.setex(key, ttl, String(currentCount));
    } else {
      this.memorySet(key, String(currentCount), ttl);
    }

    return true;
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
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '10m',
    });
  }

  /**
   * Verification Token 검증
   */
  verifyToken(phoneNumber: string, token: string): boolean {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      return (
        payload.phoneNumber === phoneNumber &&
        payload.purpose === 'phone_verification'
      );
    } catch {
      return false;
    }
  }
}
