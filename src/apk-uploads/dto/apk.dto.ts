import { IsOptional, IsString, IsIn } from 'class-validator';

export class CreateApkDto {
  @IsOptional()
  @IsString()
  name?: string;
}

export class StartMobsfScanDto {
  @IsOptional()
  @IsIn(['static', 'dynamic'])
  scanType?: string;
}

export class StartFirebaseRunDto {
  @IsOptional()
  @IsIn(['robo', 'instrumentation', 'game-loop'])
  testType?: string;

  @IsOptional()
  devices?: { model: string; version: string; locale: string; orientation: string }[];
}
