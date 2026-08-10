import { EstablishmentModule } from '@coaster/common';
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

/**
 * The assistant only gets tools for what the establishment actually runs. Without this it would
 * cheerfully offer to open a table in a law firm, and the model has no other way to know.
 */
export function getAiTools(context: AiToolsContext) {
  const has = (module: EstablishmentModule) => context.modules.includes(module);

  return {
    ...(has(EstablishmentModule.ORDERS) ? { ...createTableTools(context), ...createOrderTools(context) } : {}),
    ...(has(EstablishmentModule.INVENTORY) ? { ...createProductTools(context), ...createCategoryTools(context) } : {}),
    ...(has(EstablishmentModule.ORDERS) ? createStatsTools(context) : {}),
    ...createShiftTools(context),
    ...createMemberTools(context),
  };
}
