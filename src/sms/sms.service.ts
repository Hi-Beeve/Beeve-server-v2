import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  constructor(private readonly configService: ConfigService) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // 개발 환경에서는 실제 발송하지 않음
      if (this.configService.get('NODE_ENV') === 'development') {
        console.log(`[SMS] to ${phoneNumber}: ${message}`);
        return true;
      }

      // TODO: 실제 SMS 발송 로직 구현 (Solapi, AWS SNS, NCP SENS 등)
      return true;
    } catch (error) {
      console.error('SMS 발송 실패:', error);
      return false;
    }
  }

  async sendVerificationCode(
    phoneNumber: string,
    code: string,
  ): Promise<boolean> {
    const message = `[Beeve] 인증번호는 [${code}]입니다. 5분 이내에 입력해주세요.`;
    return this.sendSms(phoneNumber, message);
  }
}
