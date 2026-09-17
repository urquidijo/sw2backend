import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

type GradeKey = 'A' | 'B' | 'C' | 'D' | 'F';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: any) {
    const [apkCount, mobsfScans, firebaseRuns, notifications] = await Promise.all([
      this.prisma.apk.count({ where: { userId: user.id } }),
      this.prisma.mobsfScan.findMany({
        where: { apk: { userId: user.id } },
        select: { status: true, score: true, grade: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.firebaseRun.findMany({
        where: { apk: { userId: user.id } },
        select: { status: true, passedCount: true, failedCount: true, errorCount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    const completedScans = mobsfScans.filter((s) => s.status === 'COMPLETED');
    const avgScore = completedScans.length
      ? completedScans.reduce((acc: number, s) => acc + (s.score || 0), 0) / completedScans.length
      : 0;

    const gradeDistribution: Record<GradeKey, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    completedScans.forEach((s) => {
      const g = s.grade as GradeKey;
      if (g && gradeDistribution[g] !== undefined) gradeDistribution[g]++;
    });

    const totalFirebase = firebaseRuns.reduce((acc: number, r) => acc + r.passedCount + r.failedCount + r.errorCount, 0);
    const passedFirebase = firebaseRuns.reduce((acc: number, r) => acc + r.passedCount, 0);

    return {
      stats: {
        totalApks: apkCount,
        totalMobsfScans: mobsfScans.length,
        completedMobsfScans: completedScans.length,
        totalFirebaseRuns: firebaseRuns.length,
        avgSecurityScore: parseFloat(avgScore.toFixed(1)),
        unreadNotifications: notifications,
        firebaseSuccessRate: totalFirebase > 0 ? parseFloat(((passedFirebase / totalFirebase) * 100).toFixed(1)) : 0,
      },
      gradeDistribution,
      recentScans: mobsfScans.slice(0, 5),
      recentRuns: firebaseRuns.slice(0, 5),
    };
  }
}
