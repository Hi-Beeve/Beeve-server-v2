import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      map((data: T) => {
        // 이미 isSuccess 필드가 있으면 그대로 반환
        if (data && typeof data === 'object' && 'isSuccess' in data) {
          return data;
        }
        // 없으면 감싸서 반환
        return {
          isSuccess: true,
          data,
        };
      }),
    );
  }
}
