import { Module } from '@nestjs/common';
import { MobsfService } from './mobsf.service';
import { MobsfController } from './mobsf.controller';
import { AiRecommendationsService } from './ai-recommendations.service';

@Module({
  providers: [MobsfService, AiRecommendationsService],
  controllers: [MobsfController],
  exports: [MobsfService, AiRecommendationsService],
})
export class MobsfModule {}
