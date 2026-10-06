import type { DeleteResponse } from '../models/common.interface';

export const deleteResponseMapper = (dto: { success: boolean }): DeleteResponse => {
  return {
    success: dto.success,
  };
};
