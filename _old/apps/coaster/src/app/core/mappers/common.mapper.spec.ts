import { describe, expect, it } from 'vitest';
import { deleteResponseMapper } from './common.mapper';

describe('CommonMapper', () => {
  it('should map delete response correctly', () => {
    const dto = { success: true };
    const result = deleteResponseMapper(dto);
    expect(result).toEqual({ success: true });
  });
});
