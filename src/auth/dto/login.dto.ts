import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'GOOGLE',
    description: '소셜 로그인 제공자 (GOOGLE, KAKAO, APPLE)',
  })
  @IsString()
  @IsIn(['GOOGLE', 'KAKAO', 'APPLE'])
  provider: string;

  @ApiProperty({
    example: 'google123456',
    description: '소셜 로그인 제공자의 사용자 ID',
  })
  @IsString()
  providerUserId: string;
}
