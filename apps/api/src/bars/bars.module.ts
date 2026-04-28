import { Module } from '@nestjs/common';
import { BarsController } from './controllers/bars.controller';
import { BarRepository } from './data-access/bar.repository';
import { BarsService } from './services/bars.service';

@Module({
  controllers: [BarsController],
  providers: [BarsService, BarRepository],
  exports: [BarsService],
})
export class BarsModule {}
