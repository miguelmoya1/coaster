import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { BarMembersModule } from './bar-members/bar-members.module';
import { BarsModule } from './bars/bars.module';
import { CategoriesModule } from './categories/categories.module';
import { CoreModule } from './core/core.module';
import { UserModule } from './users/user.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CoreModule,
    UserModule,
    BarsModule,
    BarMembersModule,
    CategoriesModule,
  ],
})
export class AppModule {}
