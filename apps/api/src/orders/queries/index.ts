import { GetOrderByIdHandler } from './get-order-by-id/get-order-by-id.handler';
import { GetOrdersByBarIdHandler } from './get-orders-by-bar-id/get-orders-by-bar-id.handler';
import { GetOrdersByDateHandler } from './get-orders-by-date/get-orders-by-date.handler';

export { GetOrdersByBarIdQuery } from './get-orders-by-bar-id/get-orders-by-bar-id.query';
export { GetOrdersByDateQuery } from './get-orders-by-date/get-orders-by-date.query';
export { GetOrderByIdQuery } from './get-order-by-id/get-order-by-id.query';

export const QueryHandlers = [GetOrdersByBarIdHandler, GetOrdersByDateHandler, GetOrderByIdHandler];
