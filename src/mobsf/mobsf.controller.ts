import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiRecommendationsService } from './ai-recommendations.service';

@UseGuards(JwtAuthGuard)
@Controller('mobsf')
export class MobsfController {
  constructor(
    private prisma: PrismaService,
    private aiRecommendations: AiRecommendationsService,
  ) {}

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
      where: { id },
      include: { apk: true },
    });
  }

  @Post('scans/:id/ai-recommendations')
  async getAiRecommendations(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body?: { reportJson?: any; appName?: string },
  ) {
    // 1. If payload is sent directly from client, use it
    if (body?.reportJson) {
      return this.aiRecommendations.analyzeReport(
        body.reportJson,
        body.appName || 'Android App',
      );
    }

    // 2. Otherwise query database
    let scan = await this.prisma.mobsfScan.findFirst({
      where: { id, apk: { userId: user.id } },
      include: { apk: true },
    });

    if (!scan) {
      scan = await this.prisma.mobsfScan.findFirst({
        where: { id },
        include: { apk: true },
      });
    }

    if (!scan) {
      return this.aiRecommendations.analyzeReport({}, 'Android App');
    }

    const appName = scan.apk?.name || scan.apk?.originalName || 'Android App';
    return this.aiRecommendations.analyzeReport(scan.reportJson, appName);
  }
}
