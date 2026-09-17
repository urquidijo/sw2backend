import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MobsfService } from '../mobsf/mobsf.service';
import { FirebaseTestlabService } from '../firebase-testlab/firebase-testlab.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { StartFirebaseRunDto } from './dto/apk.dto';
import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';

@Injectable()
export class ApkUploadsService {
  constructor(
    private prisma: PrismaService,
    private mobsfService: MobsfService,
    private firebaseService: FirebaseTestlabService,
    private gateway: NotificationsGateway,
  ) {}

  async createApk(file: Express.Multer.File, userId: string) {
    let sha256 = '';
    try {
      const buf = readFileSync(file.path);
      sha256 = createHash('sha256').update(buf).digest('hex');
    } catch {}

    const apk = await this.prisma.apk.create({
      data: {
        name: file.originalname.replace(/\.(apk|aab)$/i, ''),
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        sha256,
        userId,
      },
    });
    return apk;
  }

  async findAll(userId: string) {
    return this.prisma.apk.findMany({
      where: { userId },
      include: {
        mobsfScans: { orderBy: { createdAt: 'desc' }, take: 1 },
        firebaseRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const apk = await this.prisma.apk.findUnique({
      where: { id },
      include: {
        mobsfScans: { orderBy: { createdAt: 'desc' } },
        firebaseRuns: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!apk) throw new NotFoundException('APK not found');
    if (apk.userId !== userId) throw new ForbiddenException();
    return apk;
  }

  async remove(id: string, userId: string) {
    const apk = await this.findOne(id, userId);
    await this.prisma.apk.delete({ where: { id } });
    return { deleted: true };
  }

  async startMobsfScan(apkId: string, userId: string, scanType: string) {
    const apk = await this.findOne(apkId, userId);

    const scan = await this.prisma.mobsfScan.create({
      data: { apkId, scanType, status: 'PENDING' },
    });

    // Run async (don't await)
    this.mobsfService
      .runScan(apk.filePath, apk.originalName, scan.id)
      .then(async (result) => {
        await this.prisma.mobsfScan.update({
          where: { id: scan.id },
          data: {
            status: 'COMPLETED',
            score: result.score,
            grade: result.grade,
            riskLevel: result.riskLevel,
            cvssScore: result.cvssScore,
            reportJson: result.reportJson,
            mobsfHash: result.hash,
            completedAt: new Date(),
          },
        });
        this.gateway.notifyUser(userId, 'scan:complete', {
          scanId: scan.id,
          apkName: apk.name,
          score: result.score,
          grade: result.grade,
        });
        await this.createNotification(userId, 'SCAN_COMPLETE', apk.name, result.grade);
      })
      .catch(async (err) => {
        await this.prisma.mobsfScan.update({
          where: { id: scan.id },
          data: { status: 'FAILED', errorMessage: err.message },
        });
        this.gateway.notifyUser(userId, 'scan:error', { scanId: scan.id });
      });

    // Mark as running
    await this.prisma.mobsfScan.update({
      where: { id: scan.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    return { scanId: scan.id, status: 'RUNNING' };
  }

  async startFirebaseRun(apkId: string, userId: string, dto: StartFirebaseRunDto) {
    const apk = await this.findOne(apkId, userId);

    const run = await this.prisma.firebaseRun.create({
      data: {
        apkId,
        testType: dto.testType || 'robo',
        status: 'PENDING',
        devices: dto.devices || this.firebaseService.getDefaultDevices(),
      },
    });

    // Run async
    this.firebaseService
      .runTests(apk.filePath, apk.originalName, run.id, dto)
      .then(async (result) => {
        await this.prisma.firebaseRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            testMatrixId: result.testMatrixId,
            resultsJson: result.results,
            passedCount: result.passed,
            failedCount: result.failed,
            errorCount: result.errors,
            completedAt: new Date(),
          },
        });
        this.gateway.notifyUser(userId, 'firebase:complete', {
          runId: run.id,
          apkName: apk.name,
          passed: result.passed,
          failed: result.failed,
        });
        await this.createNotification(userId, 'FIREBASE_COMPLETE', apk.name, `${result.passed} passed`);
      })
      .catch(async (err) => {
        await this.prisma.firebaseRun.update({
          where: { id: run.id },
          data: { status: 'FAILED', errorMessage: err.message },
        });
        this.gateway.notifyUser(userId, 'firebase:error', { runId: run.id });
      });

    await this.prisma.firebaseRun.update({
      where: { id: run.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    return { runId: run.id, status: 'RUNNING' };
  }

  private async createNotification(userId: string, type: any, apkName: string, detail: string) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: type === 'SCAN_COMPLETE' ? 'Análisis MobSF completado' : 'Firebase Test Lab completado',
        message: `APK "${apkName}" — ${detail}`,
      },
    });
  }
}
