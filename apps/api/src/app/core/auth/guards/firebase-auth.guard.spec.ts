import { FirebaseAuthGuard } from './firebase-auth.guard';

describe('FirebaseAuthGuard', () => {
  it('should be defined', () => {
    expect(new FirebaseAuthGuard()).toBeDefined();
  });
});
