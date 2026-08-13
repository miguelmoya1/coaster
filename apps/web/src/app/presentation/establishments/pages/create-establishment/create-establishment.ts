import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageContainer } from '../../../components/page-container/page-container';
import { PageHeader } from '../../../components/page-header/page-header';
import { CreateEstablishmentForm } from './components/create-establishment-form';

@Component({
  selector: 'coaster-create-establishment',
  imports: [TranslatePipe, CreateEstablishmentForm, PageContainer, PageHeader],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  template: `
    <coaster-page-container>
      <coaster-page-header
        [title]="'establishments.create.title' | translate"
        [subtitle]="'establishments.create.description' | translate"
        [badge]="'establishments.create.badge' | translate"
        backUrl="/establishments/select"
      />

      <coaster-create-establishment-form
        data-testid="create-establishment-form"
        (formSubmitted)="onSubmit()"
        (formCancelled)="onCancel()"
      />
    </coaster-page-container>
  `,
})
export default class CreateEstablishment {
  readonly #router = inject(Router);

  protected onSubmit() {
    this.#router.navigate(['/establishments/select']);
  }

  protected onCancel() {
    this.#router.navigate(['/establishments/select']);
  }
}
