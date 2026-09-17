import { Module } from '@nestjs/common';
import { MobsfService } from './mobsf.service';
import { MobsfController } from './mobsf.controller';

@Module({
  providers: [MobsfService],
  controllers: [MobsfController],
  exports: [MobsfService],
})
export class MobsfModule {}
