import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: bigint;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const member = await this.prismaService.member.findUnique({
      where: { member_id: payload.sub },
    });

    if (!member || member.deleted_yn === 'Y') {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    return {
      sub: member.member_id,
      email: member.email,
      name: member.name,
    };
  }
}
