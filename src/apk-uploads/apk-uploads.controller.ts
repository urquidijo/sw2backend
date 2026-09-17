import {
  Controller, Post, Get, Delete, Param, UploadedFile,
  UseInterceptors, UseGuards, Body, NotFoundException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApkUploadsService } from './apk-uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StartMobsfScanDto, StartFirebaseRunDto } from './dto/apk.dto';

@UseGuards(JwtAuthGuard)
@Controller('apks')
export class ApkUploadsController {
  constructor(private apkService: ApkUploadsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const unique = uuidv4();
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(apk|aab)$/i)) {
          return cb(new Error('Only APK/AAB files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    }),
  )
  async uploadApk(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.apkService.createApk(file, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.apkService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apkService.findOne(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.apkService.remove(id, user.id);
  }

  @Post(':id/mobsf-scan')
  startMobsfScan(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: StartMobsfScanDto,
  ) {
    return this.apkService.startMobsfScan(id, user.id, dto.scanType || 'static');
  }

  @Post(':id/firebase-run')
  startFirebaseRun(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: StartFirebaseRunDto,
  ) {
    return this.apkService.startFirebaseRun(id, user.id, dto);
  }
}
