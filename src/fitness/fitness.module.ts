// src/modules/fitness/fitness.module.ts

import { Module } from '@nestjs/common';
import { FitnessController } from './fitness.controller';
import { FitnessService } from './fitness.service';
import { AIRecommenderService } from '../common/services/ai-recommender.service';
import { GeminiService } from '../common/services/gemini.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [FitnessController],
  providers: [FitnessService, AIRecommenderService, GeminiService],
  exports: [FitnessService, AIRecommenderService],
})
export class FitnessModule {}