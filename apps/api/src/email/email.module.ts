import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EventHandlers } from './events';

@Module({
  providers: [EmailService, ...EventHandlers],
})
export class EmailModule {}
