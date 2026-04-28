import { describe, expect, it } from 'vitest';
import { ErrorCodes } from './error.enums';

describe('ErrorCodes', () => {
  it('should exist', () => {
    expect(ErrorCodes).toBeTruthy();
  });
});
