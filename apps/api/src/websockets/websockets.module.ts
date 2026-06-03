import { Global, Module } from '@nestjs/common';
import { BarGateway } from './bar.gateway';

@Global()
@Module({
  providers: [BarGateway],
  exports: [BarGateway],
})
export class WebsocketsModule {}
