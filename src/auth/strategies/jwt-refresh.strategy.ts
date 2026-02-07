import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'default-refresh-secret',
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: Request, payload: { sub: bigint }) {
    const refreshToken = req.get('Authorization')?.replace('Bearer ', '');

    const member = await this.prismaService.member.findUnique({
      where: { member_id: payload.sub },
    });

    if (!member || member.deleted_yn === 'Y') {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    // Refresh Token 검증은 AuthService에서 처리

    return {
      sub: member.member_id,
      email: member.email,
      refreshToken,
    };
  }
}
