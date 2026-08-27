import { FirebaseAuthGuard } from '@coaster/auth';
import { Admin, AdminGuard } from '@coaster/core';
import { BackfillReport, FichitSync } from '@coaster/fichit';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';

interface FichitStatus {
  enabled: boolean;
}

@Controller('admin/fichit')
@Admin()
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminFichitController {
  constructor(private readonly sync: FichitSync) {}

  @Get()
  status(): FichitStatus {
    return { enabled: this.sync.enabled };
  }

  @Post('backfill')
  async backfill(): Promise<BackfillReport> {
    return await this.sync.backfill();
  }

}
