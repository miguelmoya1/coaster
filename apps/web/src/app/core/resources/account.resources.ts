import { httpResource } from '@angular/common/http';
import { inject } from '@angular/core';
import type { AccountSession, AccountSummary } from '../models/auth.interface';
import { AccountRepository } from '../data-access/account-repository';

export const accountResource = () => {
  const repository = inject(AccountRepository);
  return httpResource<AccountSummary>(() => repository.routes.account);
};

export const accountSessionsResource = () => {
  const repository = inject(AccountRepository);
  return httpResource<AccountSession[]>(() => repository.routes.sessions);
};
