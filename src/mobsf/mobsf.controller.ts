import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('mobsf')
export class MobsfController {
  constructor(private prisma: PrismaService) {}

  @Get('scans')
  async getMyScans(@CurrentUser() user: any) {
    return this.prisma.mobsfScan.findMany({
      where: { apk: { userId: user.id } },
      include: { apk: { select: { name: true, originalName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('scans/:id')
  async getScan(@Param('id') id: string, @CurrentUser() user: any) {
    return this.prisma.mobsfScan.findFirst({
      where: { id, apk: { userId: user.id } },
      include: { apk: true },
    });
  }
}
