export interface BaseError {
  message: string;
  error: string;
  statusCode: number;
}

export const isBaseError = (error: unknown): error is BaseError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    'error' in error &&
    typeof error.error === 'string' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  );
};
