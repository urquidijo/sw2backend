import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Get('me/stats')
  async getStats(@CurrentUser() user: any) {
    const [apks, scans, runs] = await Promise.all([
      this.prisma.apk.count({ where: { userId: user.id } }),
      this.prisma.mobsfScan.count({ where: { apk: { userId: user.id } } }),
      this.prisma.firebaseRun.count({ where: { apk: { userId: user.id } } }),
    ]);
    return { apks, scans, runs };
  }
}
