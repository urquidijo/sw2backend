import { Module } from '@nestjs/common';
import { FirebaseTestlabService } from './firebase-testlab.service';
import { FirebaseTestlabController } from './firebase-testlab.controller';

@Module({
  providers: [FirebaseTestlabService],
  controllers: [FirebaseTestlabController],
  exports: [FirebaseTestlabService],
})
export class FirebaseTestlabModule {}
