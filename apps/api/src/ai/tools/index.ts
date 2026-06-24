import { createTableTools } from './table.tools';
import { createOrderTools } from './order.tools';
import { createProductTools } from './product.tools';
import { createCategoryTools } from './category.tools';
import type { AiToolsData } from './context';

export * from './context';
export * from './table.tools';
export * from './order.tools';
export * from './product.tools';
export * from './category.tools';

export function getAiTools(data: AiToolsData) {
  return {
    ...createTableTools(data),
    ...createOrderTools(data),
    ...createProductTools(data),
    ...createCategoryTools(data),
  };
}
