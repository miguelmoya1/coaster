import { Component, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AdminBetaTestersStore } from '@coaster/admin';
import type { BetaTester } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { ConfirmationDialog } from '../../../components/confirm-dialog/confirmation-dialog.service';
import { CoasterInput } from '../../../components/field/input.directive';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AddBetaTesterFormService } from '../../components/add-beta-tester-form/add-beta-tester-form.service';
import { AdminPagination } from '../../components/admin-pagination/admin-pagination';

@Component({
  selector: 'coaster-admin-beta-testers',
  imports: [
    MatIcon,
    MatButton,
    MatIconButton,
    DatePipe,
    TranslatePipe,
    Loading,
    PageHeader,
    AdminPagination,
    CoasterInput,
  ],
  templateUrl: './admin-beta-testers.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminBetaTesters {
  readonly #store = inject(AdminBetaTestersStore);
  readonly #addForm = inject(AddBetaTesterFormService);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  protected readonly testers = this.#store.testers;
  protected readonly total = this.#store.total;
  protected readonly page = this.#store.page;
  protected readonly pageSize = this.#store.pageSize;
  protected readonly totalPages = this.#store.totalPages;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly hasLoaded = this.#store.hasLoaded;
  protected readonly isSaving = this.#store.isSaving;
  protected readonly hasFilters = this.#store.hasFilters;
  protected readonly searchQuery = this.#store.searchQuery;

  protected onSearch(event: Event) {
    this.#store.setSearchQuery((event.target as HTMLInputElement).value);
  }

  protected clearFilters() {
    this.#store.clearFilters();
  }

  protected goToPage(page: number) {
    this.#store.goToPage(page);
  }

  protected async add() {
    if (await this.#addForm.open()) {
      this.#feedback.success(this.#translate.instant('admin.beta_testers.add_success'));
    }
  }

  protected async remove(tester: BetaTester) {
    const confirmed = await this.#confirm.confirm({
      title: this.#translate.instant('admin.beta_testers.remove_title'),
      text: this.#translate.instant('admin.beta_testers.remove_text', { email: tester.email }),
      confirmLabel: 'admin.beta_testers.remove_confirm',
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.#store.removeBetaTester(tester.id);
      this.#feedback.success(this.#translate.instant('admin.beta_testers.remove_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }
}
