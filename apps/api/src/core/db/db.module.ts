import { Global, Module } from '@nestjs/common';
import { DbService } from './services/db.service';

@Global()
@Module({
  providers: [DbService],
  exports: [DbService],
})
export class DbModule {}
