import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};
    const SENSITIVE_KEYS = ['password', 'token', 'refreshToken', 'accessToken', 'secret', 'verificationToken'];
    return Object.fromEntries(
      Object.entries(body).map(([k, v]) =>
        SENSITIVE_KEYS.includes(k) ? [k, '***'] : [k, v],
      ),
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    this.logger.log(
      `→ ${method} ${url} - body: ${JSON.stringify(this.sanitizeBody(request.body as Record<string, unknown>))} - ${ip ?? 'unknown'}`,
    );

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const statusCode = response.statusCode;
        const contentLength = response.get('content-length') || '0';

        this.logger.log(
          `${method} ${url} ${statusCode} ${contentLength} - ${Date.now() - now}ms - ${ip ?? 'unknown'} ${userAgent}`,
        );
      }),
    );
  }
}
