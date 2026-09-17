import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('firebase')
export class FirebaseTestlabController {
  constructor(private prisma: PrismaService) {}

  @Get('runs')
  async getMyRuns(@CurrentUser() user: any) {
    return this.prisma.firebaseRun.findMany({
      where: { apk: { userId: user.id } },
      include: { apk: { select: { name: true, originalName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('runs/:id')
  async getRun(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prisma.firebaseRun.findFirst({
      where: { id, apk: { userId: user.id } },
      include: { apk: true },
    });
  }

  @Get('devices')
  getAvailableDevices() {
    return {
      devices: [
        { model: 'Pixel 6', apiLevel: '33', manufacturer: 'Google', os: 'Android 13', form: 'PHONE', available: true },
        { model: 'Pixel 7 Pro', apiLevel: '33', manufacturer: 'Google', os: 'Android 13', form: 'PHONE', available: true },
        { model: 'Samsung Galaxy S22', apiLevel: '32', manufacturer: 'Samsung', os: 'Android 12', form: 'PHONE', available: true },
        { model: 'Samsung Galaxy Tab S8', apiLevel: '32', manufacturer: 'Samsung', os: 'Android 12', form: 'TABLET', available: true },
        { model: 'OnePlus 10 Pro', apiLevel: '32', manufacturer: 'OnePlus', os: 'Android 12', form: 'PHONE', available: true },
        { model: 'Xiaomi 12', apiLevel: '31', manufacturer: 'Xiaomi', os: 'Android 11', form: 'PHONE', available: true },
        { model: 'Moto G Power (2022)', apiLevel: '29', manufacturer: 'Motorola', os: 'Android 9', form: 'PHONE', available: true },
        { model: 'Pixel 4a', apiLevel: '30', manufacturer: 'Google', os: 'Android 10', form: 'PHONE', available: true },
      ],
    };
  }
}
