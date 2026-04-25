import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailLoginDto {
  @ApiProperty({ example: 'beeve.test@gmail.com', description: '이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'test1234!', description: '비밀번호 (최소 6자)' })
  @IsString()
  @MinLength(6)
  password: string;
}
