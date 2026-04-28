import { Module } from '@nestjs/common';
import { BarMembersController } from './controllers/bar-members.controller';
import { BarMembersRepository } from './data-access/bar-members.repository';
import { BarMembersService } from './services/bar-members.service';

@Module({
  providers: [BarMembersRepository, BarMembersService],
  controllers: [BarMembersController],
})
export class BarMembersModule {}
