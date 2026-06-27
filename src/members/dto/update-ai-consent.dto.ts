import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAiConsentDto {
  @ApiProperty({ example: true, description: 'AI 서비스 정보 제공 동의 여부' })
  @IsBoolean()
  aiConsent: boolean;
}
