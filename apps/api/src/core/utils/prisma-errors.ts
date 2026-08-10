/**
 * Prisma raises P2025 when a write matched no row. Where the `where` clause is scoped by establishmentId,
 * that means the id belongs to somebody else's establishment (or to nothing), which is a 404 rather than the
 * 500 an unhandled driver error would produce.
 */
export function isRecordNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}
