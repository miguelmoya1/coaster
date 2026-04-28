import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BarMembersModule } from './bar-members/bar-members.module';
import { BarsModule } from './bars/bars.module';
import { CategoriesModule } from './categories/categories.module';
import { CoreModule } from './core/core.module';
import { ProductsModule } from './products/products.module';
import { ShiftExchangesModule } from './shift-exchanges/shift-exchanges.module';
import { ShiftsModule } from './shifts/shifts.module';
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
  ],
})
export class AppModule {}
