import { TreeValidationResult } from '@angular/forms/signals';
import { ApiError } from '../errors/api-error';

export const handleError = (error: unknown) => {
  return error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR';
};

export const handleErrorFormField: (error: unknown) => TreeValidationResult = (error: unknown) => {
  return {
    kind: 'processing_error',
    message: handleError(error),
  };
};
