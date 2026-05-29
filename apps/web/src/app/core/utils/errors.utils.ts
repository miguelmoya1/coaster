import { TreeValidationResult } from '@angular/forms/signals';
import { environment } from '@coaster/env';
import { ApiError } from '../errors/api-error';

const handleError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'UNEXPECTED_ERROR';
};

export const handleErrorFormField: (error: unknown) => TreeValidationResult = (error: unknown) => {
  if (!environment.production) {
    console.error(error);
  }

  return {
    kind: 'processing_error',
    message: handleError(error),
  };
};
