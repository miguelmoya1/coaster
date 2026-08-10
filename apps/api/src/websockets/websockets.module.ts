import { Global, Module } from '@nestjs/common';
import { EstablishmentGateway } from './establishment.gateway';
import { WsEventHandlers } from './events';
import { WsAuthService } from './services';

@Global()
@Module({
  providers: [EstablishmentGateway, WsAuthService, ...WsEventHandlers],
  exports: [EstablishmentGateway],
})
export class WebsocketsModule {}
