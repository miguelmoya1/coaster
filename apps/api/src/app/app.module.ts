import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CoreModule } from './core/core.module';
import { UserModule } from './users/user.module';

@Module({
  controllers: [AppController],
  imports: [CoreModule, UserModule],
})
export class AppModule {}
