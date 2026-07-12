import { Global, Module } from '@nestjs/common';
import { BarGateway } from './bar.gateway';
import { WsEventHandlers } from './events';

@Global()
@Module({
  providers: [BarGateway, ...WsEventHandlers],
  exports: [BarGateway],
})
export class WebsocketsModule {}
