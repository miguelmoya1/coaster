import { describe, it, expect } from 'vitest';

import { OptionalFirebaseAuthGuard } from './optional-firebase-auth.guard';

describe('OptionalFirebaseAuthGuard', () => {
  it('should be defined', () => {
    expect(new OptionalFirebaseAuthGuard()).toBeDefined();
  });
});
