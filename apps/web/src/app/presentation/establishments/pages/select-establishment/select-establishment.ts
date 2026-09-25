import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import type { Establishment } from '@coaster/common';
import { CurrentUser, type PageResource } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ResourceStatus } from '../../../components/resource-status/resource-status';
import { PageContainer } from '../../../components/page-container/page-container';
import { PageHeader } from '../../../components/page-header/page-header';
import { EstablishmentCard } from './components/establishment-card/establishment-card';

@Component({
  selector: 'coaster-select-establishment',
  imports: [
    EstablishmentCard,
    TranslatePipe,
    MatButton,
    MatIcon,
    RouterLink,
    ResourceStatus,
    PageContainer,
    PageHeader,
  ],
  templateUrl: './select-establishment.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class SelectEstablishment {
  readonly #router = inject(Router);
  readonly #currentUser = inject(CurrentUser);

  public readonly establishments = input.required<PageResource<Establishment[]>>();

  protected readonly list = computed(() => {
    const establishments = this.establishments();
    return establishments.hasValue() ? (establishments.value() ?? []) : [];
  });
  readonly isAdmin = this.#currentUser.isAdmin;

  navigateToCreate() {
    this.#router.navigate(['/establishments/create']);
  }

  selectEstablishment(id: string) {
    this.#router.navigate(['/establishments', id, 'dashboard']);
  }
}
