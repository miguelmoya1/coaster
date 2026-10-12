export const pageOf = (page: string | undefined): number => {
  const parsed = Number(page);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

export const oneOf = <T extends string>(allowed: readonly T[], value: string | undefined): T | undefined =>
  allowed.find((candidate) => candidate === value);

export const flagOf = (value: string | undefined): boolean | undefined =>
  value === 'true' ? true : value === 'false' ? false : undefined;

export const searchOf = (value: string | undefined): string | undefined => value?.trim() || undefined;

export const totalPagesOf = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / pageSize));
