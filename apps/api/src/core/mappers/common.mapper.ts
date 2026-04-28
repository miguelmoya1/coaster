import { DeleteResponse } from '@coaster/common';

export const commonMapper = {
  getSuccessResponse: (): DeleteResponse => ({
    success: true,
  }),
};
