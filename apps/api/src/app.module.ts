import { AdminModule } from '@coaster/admin';
import { AiModule } from '@coaster/ai';
import { AuthModule } from '@coaster/auth';
import { BarMembersModule } from '@coaster/bar-members';
import { BarSubscriptionModule } from '@coaster/bar-subscription';
import { BarsModule } from '@coaster/bars';
import { CategoriesModule } from '@coaster/categories';
import { SecurityModule } from '@coaster/core';
import { DbModule } from '@coaster/core/db';
import { EmailModule } from '@coaster/email';
import { MediaModule } from '@coaster/media';
import { OrdersModule } from '@coaster/orders';
import { PrinterModule } from '@coaster/printer';
import { ProductsModule } from '@coaster/products';
import { ShiftExchangesModule } from '@coaster/shift-exchanges';
import { ShiftsModule } from '@coaster/shifts';
import { StatsModule } from '@coaster/stats';
import { StripeModule } from '@coaster/stripe';
import { TablesModule } from '@coaster/tables';
import { TemplatesModule } from '@coaster/templates';
import { TimeTrackingModule } from '@coaster/time-tracking';
import { UserModule } from '@coaster/users';
import { WebsocketsModule } from '@coaster/websockets';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: seconds(60), limit: 300 }],
    }),
    DbModule,
    StripeModule,
    EmailModule,
    WebsocketsModule,
    AuthModule,
    UserModule,
    BarsModule,
    BarSubscriptionModule,
    BarMembersModule,
    CategoriesModule,
    ProductsModule,
    ShiftsModule,
    ShiftExchangesModule,
    TimeTrackingModule,
    TemplatesModule,
    TablesModule,
    OrdersModule,
    StatsModule,
    PrinterModule,
    SecurityModule,
    AiModule,
    MediaModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
