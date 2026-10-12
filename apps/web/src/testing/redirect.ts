import { RedirectCommand } from '@angular/router';
import { expect } from 'vitest';

export const redirectOf = async (guard: Promise<unknown>): Promise<unknown> => {
  const error = await guard.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );

  expect(error).toBeInstanceOf(RedirectCommand);
  return (error as RedirectCommand).redirectTo;
};
