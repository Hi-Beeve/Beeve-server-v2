import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PhoneVerificationService } from './phone-verification.service';
import { JwtStrategy, JwtRefreshStrategy } from './strategies';
import { RedisModule } from '../redis';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PhoneVerificationService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, PhoneVerificationService],
})
export class AuthModule {}
