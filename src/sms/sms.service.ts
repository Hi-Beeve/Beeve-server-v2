import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolapiMessageService } from 'solapi';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    // 개발 환경에서는 실제 발송하지 않음
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(`[SMS 개발모드] to ${phoneNumber}: ${message}`);
      return true;
    }

    try {
      const apiKey = this.configService.get<string>('SOLAPI_API_KEY');
      const apiSecret = this.configService.get<string>('SOLAPI_API_SECRET');
      const senderNumber = this.configService.get<string>('SOLAPI_SENDER_NUMBER');

      if (!apiKey || !apiSecret || !senderNumber) {
        this.logger.error('Solapi 환경변수가 누락되었습니다. (SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER)');
        return false;
      }

      const messageService = new SolapiMessageService(apiKey, apiSecret);

      await messageService.sendOne({
        to: phoneNumber,
        from: senderNumber,
        text: message,
      });

      this.logger.log(`SMS 발송 성공: ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`SMS 발송 실패: ${error.message}`, error.stack);
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
