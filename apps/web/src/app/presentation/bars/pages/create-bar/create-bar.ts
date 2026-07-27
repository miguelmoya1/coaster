import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageContainer } from '../../../components/page-container/page-container';
import { PageHeader } from '../../../components/page-header/page-header';
import { CreateBarForm } from './components/create-bar-form';

@Component({
  selector: 'coaster-create-bar',
  imports: [TranslatePipe, CreateBarForm, PageContainer, PageHeader],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  template: `
    <coaster-page-container size="sm">
      <coaster-page-header
        [title]="'bars.create.title' | translate"
        [subtitle]="'bars.create.description' | translate"
        [badge]="'bars.create.badge' | translate"
        backUrl="/bars/select"
      />

      <coaster-create-bar-form
        data-testid="create-bar-form"
        (formSubmitted)="onSubmit()"
        (formCancelled)="onCancel()"
      />
    </coaster-page-container>
  `,
})
export default class CreateBar {
  readonly #router = inject(Router);

  protected onSubmit() {
    this.#router.navigate(['/bars/select']);
  }

  protected onCancel() {
    this.#router.navigate(['/bars/select']);
  }
}
