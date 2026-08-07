import { createCategoryTools } from './category.tools';
import type { AiToolsContext } from './context';
import { createMemberTools } from './member.tools';
import { createOrderTools } from './order.tools';
import { createProductTools } from './product.tools';
import { createShiftTools } from './shift.tools';
import { createStatsTools } from './stats.tools';
import { createTableTools } from './table.tools';

export * from './category.tools';
export * from './context';
export * from './member.tools';
export * from './order.tools';
export * from './product.tools';
export * from './shift.tools';
export * from './stats.tools';
export * from './table.tools';

export function getAiTools(context: AiToolsContext) {
  return {
    ...createTableTools(context),
    ...createOrderTools(context),
    ...createProductTools(context),
    ...createCategoryTools(context),
    ...createShiftTools(context),
    ...createMemberTools(context),
    ...createStatsTools(context),
  };
}
