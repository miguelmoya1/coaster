import { Global, Module } from '@nestjs/common';
import { BarGateway } from './bar.gateway';
import { EventHandlers } from './events';

@Global()
@Module({
  providers: [BarGateway, ...EventHandlers],
  exports: [BarGateway],
})
export class WebsocketsModule {}
