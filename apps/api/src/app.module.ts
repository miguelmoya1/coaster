import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BarMembersModule } from './bar-members/bar-members.module';
import { BarsModule } from './bars/bars.module';
import { BillingModule } from './billing/billing.module';
import { CategoriesModule } from './categories/categories.module';
import { DbModule } from './core/db';
import { SecurityModule } from './core/security/security.module';
import { EmailModule } from './email/email.module';
import { MediaModule } from './media/media.module';
import { OrdersModule } from './orders/orders.module';
import { PrinterModule } from './printer/printer.module';
import { ProductsModule } from './products/products.module';
import { ShiftExchangesModule } from './shift-exchanges/shift-exchanges.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StatsModule } from './stats/stats.module';
import { TablesModule } from './tables/tables.module';
import { TemplatesModule } from './templates/templates.module';
import { UserModule } from './users/user.module';
import { WebsocketsModule } from './websockets/websockets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    EmailModule,
    WebsocketsModule,
    AuthModule,
    UserModule,
    BarsModule,
    BillingModule,
    BarMembersModule,
    CategoriesModule,
    ProductsModule,
    ShiftsModule,
    ShiftExchangesModule,
    TemplatesModule,
    TablesModule,
    OrdersModule,
    StatsModule,
    PrinterModule,
    SecurityModule,
    AiModule,
    MediaModule,
  ],
})
export class AppModule {}
