import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityRepository } from './data-access/security.repository';
import { AdminGuard } from './guards/admin.guard';
import { BarPermissionsGuard } from './guards/bar-permissions.guard';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';

@Global()
@Module({
  providers: [
    SecurityRepository,
    AdminGuard,
    BarPermissionsGuard,
    SubscriptionActiveGuard,
    {
      provide: APP_GUARD,
      useClass: SubscriptionActiveGuard,
    },
  ],
  exports: [AdminGuard, BarPermissionsGuard, SubscriptionActiveGuard, SecurityRepository],
})
export class SecurityModule {}
