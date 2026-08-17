import { Module } from '@nestjs/common';
import { RealtimeEventHandlers } from './events';
import { RealtimeController } from './realtime.controller';
import { RealtimeBus, RealtimeRegistry, RealtimeService } from './services';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeRegistry, RealtimeBus, RealtimeService, ...RealtimeEventHandlers],
  exports: [RealtimeService],
})
export class RealtimeModule {}
