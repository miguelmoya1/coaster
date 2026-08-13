import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityRepository } from './data-access/security.repository';
import { FirebaseTokenService } from './services/firebase-token.service';
import { AdminGuard } from './guards/admin.guard';
import { EstablishmentModulesGuard } from './guards/establishment-modules.guard';
import { EstablishmentPermissionsGuard } from './guards/establishment-permissions.guard';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';

@Global()
@Module({
  providers: [
    SecurityRepository,
    FirebaseTokenService,
    AdminGuard,
    EstablishmentPermissionsGuard,
    EstablishmentModulesGuard,
    SubscriptionActiveGuard,
    {
      provide: APP_GUARD,
      useClass: SubscriptionActiveGuard,
    },
  ],
  exports: [
    AdminGuard,
    EstablishmentPermissionsGuard,
    EstablishmentModulesGuard,
    SubscriptionActiveGuard,
    SecurityRepository,
    FirebaseTokenService,
  ],
})
export class SecurityModule {}
