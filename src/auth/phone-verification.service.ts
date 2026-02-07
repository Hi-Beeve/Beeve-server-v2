import { Injectable, Inject } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { REDIS_CLIENT } from '../redis';

@Injectable()
export class PhoneVerificationService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // 인증번호 저장 (5분 TTL)
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

  // 인증번호 조회
  async getVerificationCode(phoneNumber: string): Promise<any> {
    const key = `phone_verify:${phoneNumber}`;
    const data = await this.redis.get(key);

    if (!data) return null;

    return typeof data === 'string' ? JSON.parse(data) : data;
  }

  // 시도 횟수 증가
  async incrementAttempts(phoneNumber: string): Promise<number> {
    const key = `phone_verify:${phoneNumber}`;
    const data = await this.getVerificationCode(phoneNumber);

    if (!data) return 0;

    data.attempts += 1;

    // TTL 유지하면서 업데이트
    const ttl = await this.redis.ttl(key);
    await this.redis.setex(key, ttl, JSON.stringify(data));

    return data.attempts;
  }

  // 인증 완료 후 삭제
  async deleteVerificationCode(phoneNumber: string): Promise<void> {
    const key = `phone_verify:${phoneNumber}`;
    await this.redis.del(key);
  }

  // 발송 제한 체크 (1분에 1회)
  async checkRateLimit(phoneNumber: string): Promise<boolean> {
    const key = `phone_ratelimit:${phoneNumber}`;
    const exists = await this.redis.exists(key);

    if (exists) return false; // 제한 중

    // 1분(60초) 동안 재발송 불가
    await this.redis.setex(key, 60, '1');
    return true; // 발송 가능
  }

  // 일일 발송 제한 체크 (하루 5회)
  async checkDailyLimit(phoneNumber: string): Promise<boolean> {
    const key = `phone_daily:${phoneNumber}`;
    const count = await this.redis.get(key);

    if (count && Number(count) >= 5) return false; // 제한 초과

    const currentCount = count ? Number(count) + 1 : 1;

    // 자정까지 남은 시간 계산
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);

    await this.redis.setex(key, ttl, String(currentCount));
    return true; // 발송 가능
  }

  // Verification Token 저장 (10분 TTL)
  async saveVerificationToken(
    phoneNumber: string,
    token: string
  ): Promise<void> {
    const key = `phone_token:${phoneNumber}`;
    await this.redis.setex(key, 600, token); // 10분
  }

  // Verification Token 검증
  async verifyToken(phoneNumber: string, token: string): Promise<boolean> {
    const key = `phone_token:${phoneNumber}`;
    const storedToken = await this.redis.get(key);

    if (!storedToken) return false;

    return storedToken === token;
  }

  // Token 사용 후 삭제
  async deleteVerificationToken(phoneNumber: string): Promise<void> {
    const key = `phone_token:${phoneNumber}`;
    await this.redis.del(key);
  }
}
