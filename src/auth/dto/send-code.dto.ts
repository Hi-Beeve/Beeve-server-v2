import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SendCodeDto {
  @ApiProperty({
    example: '01012345678',
    description: '휴대폰 번호 (하이픈 없이)',
  })
  @IsString()
  @Matches(/^01[0-9]{8,9}$/, {
    message: '유효하지 않은 전화번호 형식입니다.',
  })
  phoneNumber: string;
}
