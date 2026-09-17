import { Module } from '@nestjs/common';
import { ApkUploadsController } from './apk-uploads.controller';
import { ApkUploadsService } from './apk-uploads.service';
import { MobsfModule } from '../mobsf/mobsf.module';
import { FirebaseTestlabModule } from '../firebase-testlab/firebase-testlab.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MobsfModule, FirebaseTestlabModule, NotificationsModule],
  controllers: [ApkUploadsController],
  providers: [ApkUploadsService],
})
export class ApkUploadsModule {}
