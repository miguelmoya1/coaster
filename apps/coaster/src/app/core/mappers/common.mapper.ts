import { DeleteResponse } from '@coaster/interfaces';

export const deleteResponseMapper = (dto: { success: boolean }): DeleteResponse => {
  return {
    success: dto.success,
  };
};
