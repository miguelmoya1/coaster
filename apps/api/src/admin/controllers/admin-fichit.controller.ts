import { Admin, AdminGuard } from '@coaster/core';
import { CurrentUser, FirebaseAuthGuard } from '@coaster/auth';
import type { User } from '@coaster/common';
import { BackfillReport, FichitSettings, FichitSettingsView, FichitSync } from '@coaster/fichit';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { FichitSettingsDto } from '../dto';

interface FichitStatus extends FichitSettingsView {
  enabled: boolean;
}

@Controller('admin/fichit')
@Admin()
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class AdminFichitController {
  constructor(
    private readonly sync: FichitSync,
    private readonly settings: FichitSettings,
  ) {}

  @Get()
  async status(): Promise<FichitStatus> {
    return { enabled: await this.sync.enabled(), ...(await this.settings.view()) };
  }

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async configure(@Body() dto: FichitSettingsDto, @CurrentUser() actor: User): Promise<void> {
    await this.settings.save(dto.apiUrl, dto.apiKey, actor.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async forget(@CurrentUser() actor: User): Promise<void> {
    await this.settings.forget(actor.id);
  }

  @Post('backfill')
  async backfill(): Promise<BackfillReport> {
    return await this.sync.backfill();
  }

}
