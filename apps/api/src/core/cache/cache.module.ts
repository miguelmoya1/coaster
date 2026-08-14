import { Global, Module } from '@nestjs/common';
import { CacheConnection } from './cache.connection';
import { CacheService } from './cache.service';
import { ThrottlerCacheStorage } from './throttler-cache.storage';

@Global()
@Module({
  providers: [CacheConnection, CacheService, ThrottlerCacheStorage],
  exports: [CacheConnection, CacheService, ThrottlerCacheStorage],
})
export class CacheModule {}
