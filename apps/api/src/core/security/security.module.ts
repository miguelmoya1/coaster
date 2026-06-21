import { Global, Module } from '@nestjs/common';
import { SecurityRepository } from './data-access/security.repository';
import { AdminGuard } from './guards/admin.guard';
import { BarPermissionsGuard } from './guards/bar-permissions.guard';

@Global()
@Module({
  providers: [SecurityRepository, AdminGuard, BarPermissionsGuard],
  exports: [AdminGuard, BarPermissionsGuard, SecurityRepository],
})
export class SecurityModule {}
