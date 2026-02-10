import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const logger = new Logger('RedisModule');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const url = configService.get('UPSTASH_REDIS_REST_URL');
        const token = configService.get('UPSTASH_REDIS_REST_TOKEN');

        if (!url || !token) {
          logger.warn(
            'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Redis disabled.',
          );
          return null;
        }

        return new Redis({ url, token });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
