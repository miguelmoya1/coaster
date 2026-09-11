import { AUTH_MAILER } from '@coaster/core';
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EventHandlers } from './events';

@Global()
@Module({
  providers: [EmailService, { provide: AUTH_MAILER, useExisting: EmailService }, ...EventHandlers],
  exports: [AUTH_MAILER],
})
export class EmailModule {}
