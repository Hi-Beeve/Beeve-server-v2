import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({
    example: '01012345678',
    description: '휴대폰 번호 (하이픈 없이)',
  })
  @IsString()
  @Matches(/^01[0-9]{8,9}$/, {
    message: '유효하지 않은 전화번호 형식입니다.',
  })
  phoneNumber: string;

  @ApiProperty({
    example: '123456',
    description: '6자리 인증번호',
  })
  @IsString()
  @Length(6, 6, { message: '인증번호는 6자리입니다.' })
  code: string;
}
