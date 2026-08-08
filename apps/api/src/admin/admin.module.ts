import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { AdminControllers } from './controllers';
import {
  AdminAuditRepository,
  AdminBarReadRepository,
  AdminMetricsReadRepository,
  AdminUserReadRepository,
  AdminWriteRepository,
} from './data-access';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [...AdminControllers],
  providers: [
    AdminAuditRepository,
    AdminBarReadRepository,
    AdminMetricsReadRepository,
    AdminUserReadRepository,
    AdminWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
})
export class AdminModule {}
