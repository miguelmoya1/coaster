import type { Establishment } from '@coaster/common';

export const checkIsEstablishment = (establishment: unknown): establishment is Establishment => {
  return (
    typeof establishment === 'object' && establishment !== null && 'id' in establishment && 'name' in establishment
  );
};

export const establishmentMapper = (establishment: unknown): Establishment => {
  if (!checkIsEstablishment(establishment)) {
    throw new Error('Invalid Establishment payload');
  }

  return { ...establishment };
};

export const establishmentArrayMapper = (establishments: unknown): Establishment[] => {
  if (!Array.isArray(establishments)) {
    throw new Error('Expected array of Establishments');
  }

  return establishments.map(establishmentMapper);
};
