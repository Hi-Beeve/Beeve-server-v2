import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({
    example: '홍길동',
    description: '사용자 이름',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: '이메일 주소',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'https://example.com/profile.jpg',
    description: '프로필 이미지 URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  profileUrl?: string;

  @ApiProperty({
    example: 'M',
    description: '성별 (M: 남성, F: 여성)',
  })
  @IsString()
  @IsIn(['M', 'F'])
  gender: string;

  @ApiProperty({
    example: '1990-01-01',
    description: '생년월일 (YYYY-MM-DD)',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    example: 175.5,
    description: '키 (cm)',
  })
  @IsNumber()
  height: number;

  @ApiProperty({
    example: 70.0,
    description: '몸무게 (kg)',
  })
  @IsNumber()
  weight: number;

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
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: '휴대폰 인증 완료 후 발급받은 토큰',
  })
  @IsString()
  verificationToken: string;
}
