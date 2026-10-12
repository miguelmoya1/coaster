import { computed, type Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, firstValueFrom } from 'rxjs';

export const until = async (condition: () => boolean, injector: Injector): Promise<void> => {
  await firstValueFrom(toObservable(computed(condition), { injector }).pipe(filter(Boolean)));
};
