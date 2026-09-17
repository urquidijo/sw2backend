import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsGateway],
  controllers: [NotificationsController],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
