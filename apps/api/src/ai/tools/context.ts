import { CommandBus } from '@nestjs/cqrs';
import type { BarId, BarPermission, Category, Product } from '@coaster/common';

export interface AiToolsContext {
  barId: BarId;
  commandBus: CommandBus;
  products: Product[];
  categories: Category[];
  runAction: (perm: BarPermission, action: () => Promise<any>) => Promise<string>;
}
