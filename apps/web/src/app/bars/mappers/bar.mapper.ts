import type { Bar } from '@coaster/common';

export const checkIsBar = (bar: unknown): bar is Bar => {
  return typeof bar === 'object' && bar !== null && 'id' in bar && 'name' in bar;
};

export const barMapper = (bar: unknown): Bar => {
  if (!checkIsBar(bar)) {
    throw new Error('Invalid Bar payload');
  }

  return { ...bar };
};

export const barArrayMapper = (bars: unknown): Bar[] => {
  if (!Array.isArray(bars)) {
    throw new Error('Expected array of Bars');
  }

  return bars.map(barMapper);
};
