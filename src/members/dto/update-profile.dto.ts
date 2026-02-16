import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum Gender {
  M = 'M',
  F = 'F',
}

export class UpdateProfileDto {
  @ApiProperty({ example: '홍길동', description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1995-03-15', description: '생년월일 (YYYY-MM-DD)' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: 'M', description: '성별', enum: Gender, enumName: 'Gender' })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 175.5, description: '키 (cm)' })
  @IsNumber()
  @Min(0)
  height: number;

  @ApiProperty({ example: 70.2, description: '체중 (kg)' })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: '프로필 이미지 URL', required: false })
  @IsOptional()
  @IsString()
  profileUrl?: string;
}
