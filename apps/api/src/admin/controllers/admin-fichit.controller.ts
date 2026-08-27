import { FirebaseAuthGuard } from '@coaster/auth';
import type { EstablishmentId } from '@coaster/common';
import { Admin, AdminGuard } from '@coaster/core';
import { BackfillReport, FichitError, FichitSync } from '@coaster/fichit';
import {
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

interface FichitStatus {
  enabled: boolean;
}

interface ClockingMoved {
  since: string;
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

  @Post('establishments/:establishmentId/clocking')
  async moveClocking(@Param('establishmentId') establishmentId: EstablishmentId): Promise<ClockingMoved> {
    return { since: (await this.sync.moveClocking(establishmentId)).toISOString() };
  }

  @Delete('establishments/:establishmentId/clocking')
  @HttpCode(HttpStatus.NO_CONTENT)
  async undoClockingMove(@Param('establishmentId') establishmentId: EstablishmentId): Promise<void> {
    try {
      await this.sync.undoClockingMove(establishmentId);
    } catch (error) {
      if (error instanceof FichitError && error.status === 409) {
        throw new ConflictException(error.code);
      }
      throw error;
    }
  }
}
