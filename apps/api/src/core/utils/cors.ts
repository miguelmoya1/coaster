export const CORS_ORIGINS = 'CORS_ORIGINS';

export const DEVELOPMENT_CORS_ORIGINS = ['http://localhost:4200'];

export const resolveCorsOrigins = (value: string | undefined, isProduction: boolean): string[] => {
  const configured = (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return isProduction ? [] : DEVELOPMENT_CORS_ORIGINS;
};
