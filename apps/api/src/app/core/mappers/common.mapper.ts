import { DeleteResponse } from '@coaster/interfaces';

export const commonMapper = {
  getSuccessResponse: (): DeleteResponse => ({
    success: true,
  }),
};
