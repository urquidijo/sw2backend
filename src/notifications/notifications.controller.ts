import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getNotifications(@CurrentUser() user: any) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: any) {
    await this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
    return { success: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: any) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
