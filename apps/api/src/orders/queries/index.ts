import { GetOrderByIdHandler } from './handlers/get-order-by-id.handler';
import { GetOrdersByEstablishmentIdHandler } from './handlers/get-orders-by-establishment-id.handler';
import { GetOrdersByDateHandler } from './handlers/get-orders-by-date.handler';

export { GetOrderByIdQuery } from './impl/get-order-by-id.query';
export { GetOrdersByEstablishmentIdQuery } from './impl/get-orders-by-establishment-id.query';
export { GetOrdersByDateQuery } from './impl/get-orders-by-date.query';

export const QueryHandlers = [GetOrderByIdHandler, GetOrdersByEstablishmentIdHandler, GetOrdersByDateHandler];
