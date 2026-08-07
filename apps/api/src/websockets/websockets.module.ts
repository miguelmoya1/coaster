import { Global, Module } from '@nestjs/common';
import { BarGateway } from './bar.gateway';
import { WsEventHandlers } from './events';
import { WsAuthService } from './services';

@Global()
@Module({
  providers: [BarGateway, WsAuthService, ...WsEventHandlers],
  exports: [BarGateway],
})
export class WebsocketsModule {}
