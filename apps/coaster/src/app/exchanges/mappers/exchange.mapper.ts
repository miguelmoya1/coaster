import { ShiftExchange } from '@coaster/interfaces';

export const checkIsExchange = (exchange: unknown): exchange is ShiftExchange => {
  return (
    typeof exchange === 'object' &&
    exchange !== null &&
    'id' in exchange &&
    'shiftId' in exchange &&
    'status' in exchange
  );
};

export const exchangeMapper = (exchange: unknown): ShiftExchange => {
  if (!checkIsExchange(exchange)) {
    throw new Error('Invalid Exchange payload');
  }
  return { ...exchange };
};

export const exchangeArrayMapper = (exchanges: unknown): ShiftExchange[] => {
  if (!Array.isArray(exchanges)) throw new Error('Expected array of Exchanges');
  return exchanges.map(exchangeMapper);
};
