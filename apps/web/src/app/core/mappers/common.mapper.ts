import type { DeleteResponse } from '@coaster/common';

export const deleteResponseMapper = (dto: { success: boolean }): DeleteResponse => {
  return {
    success: dto.success,
  };
};
