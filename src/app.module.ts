import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { AuthModule } from './auth';
import { MembersModule } from './members';
import { FitnessModule } from './fitness';
import { ExerciseModule } from './exercise';
import { HealthModule } from './health';
import { JwtAuthGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    MembersModule,
    FitnessModule,
    ExerciseModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
