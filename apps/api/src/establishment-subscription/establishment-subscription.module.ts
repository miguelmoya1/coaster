import { StripeModule } from '@coaster/stripe';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { EstablishmentSubscriptionControllers } from './controllers';
import { EstablishmentSubscriptionReadRepository, EstablishmentSubscriptionWriteRepository } from './data-access';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule, StripeModule],
  controllers: [...EstablishmentSubscriptionControllers],
  providers: [
    EstablishmentSubscriptionReadRepository,
    EstablishmentSubscriptionWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [EstablishmentSubscriptionReadRepository, EstablishmentSubscriptionWriteRepository],
})
export class EstablishmentSubscriptionModule {}
