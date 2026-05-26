import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BarMembersModule } from './bar-members/bar-members.module';
import { BarsModule } from './bars/bars.module';
import { CategoriesModule } from './categories/categories.module';
import { CoreModule } from './core/core.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ShiftExchangesModule } from './shift-exchanges/shift-exchanges.module';
import { ShiftsModule } from './shifts/shifts.module';
import { TablesModule } from './tables/tables.module';
import { TemplatesModule } from './templates/templates.module';
import { UserModule } from './users/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CoreModule,
    UserModule,
    BarsModule,
    BarMembersModule,
    CategoriesModule,
    ProductsModule,
    ShiftsModule,
    ShiftExchangesModule,
    TemplatesModule,
    TablesModule,
    OrdersModule,
  ],
})
export class AppModule {}
