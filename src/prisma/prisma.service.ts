import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.warn('Initial DB connection failed, will retry on first query:', (error as Error).message);
      // Don't throw — Neon serverless may need a warm-up query instead
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
