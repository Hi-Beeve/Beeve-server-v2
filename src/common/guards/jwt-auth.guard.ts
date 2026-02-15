import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // 토큰 만료 - 403 Forbidden + AUTH102 (refresh 필요)
    if (info instanceof TokenExpiredError) {
      throw new ForbiddenException({
        code: 'AUTH102',
        message: 'Access token has expired',
      });
    }

    // 유효하지 않은 토큰 - 403 Forbidden + AUTH103
    if (info instanceof JsonWebTokenError) {
      throw new ForbiddenException({
        code: 'AUTH103',
        message: 'Invalid access token',
      });
    }

    // 토큰 없음 - 401 Unauthorized (인증 자체가 없음)
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH104',
        message: 'Access token is required',
      });
    }

    // 기타 에러
    if (err) {
      throw new ForbiddenException({
        code: 'AUTH100',
        message: err.message || 'Authentication failed',
      });
    }

    return user;
  }
}
