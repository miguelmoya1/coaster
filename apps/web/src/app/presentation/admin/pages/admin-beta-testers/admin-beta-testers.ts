import { Component, computed, debounced, effect, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_PAGE_SIZE, ManagePlatform, pageOf, searchOf, totalPagesOf } from '@coaster/admin';
import type { AdminBetaTesters as BetaTestersPage, BetaTester } from '@coaster/common';
import { ActionFeedback, type PageResource } from '@coaster/core';
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
  public readonly results = input.required<PageResource<BetaTestersPage>>();
  public readonly q = input<string>();
  public readonly page = input<string>();

  readonly #managePlatform = inject(ManagePlatform);
  readonly #addForm = inject(AddBetaTesterFormService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  readonly #loaded = computed(() => {
    const results = this.results();
    return results.hasValue() ? results.value() : undefined;
  });

  protected readonly searchQuery = linkedSignal(() => this.q() ?? '');
  readonly #typed = debounced(this.searchQuery, 400);

  protected readonly testers = computed(() => this.#loaded()?.items ?? []);
  protected readonly enforcing = computed(() => this.#loaded()?.enforcing ?? false);
  protected readonly total = computed(() => this.#loaded()?.total ?? 0);
  protected readonly currentPage = computed(() => pageOf(this.page()));
  protected readonly pageSize = ADMIN_PAGE_SIZE.betaTesters;
  protected readonly totalPages = computed(() => totalPagesOf(this.total(), this.pageSize));
  protected readonly isLoading = computed(() => this.results().isLoading() || this.#typed.status() === 'loading');
  protected readonly hasLoaded = computed(() => this.results().hasValue());
  protected readonly isSaving = signal(false);
  protected readonly hasFilters = computed(() => Boolean(searchOf(this.searchQuery())));

  constructor() {
    effect(() => {
      const typed = searchOf(this.#typed.value());

      if (typed !== searchOf(untracked(this.q))) {
        untracked(() => this.#query({ q: typed ?? null, page: null }));
      }
    });
  }

  protected onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters() {
    this.searchQuery.set('');
    this.#query({ q: null, page: null });
  }

  protected goToPage(page: number) {
    this.#query({ page: Math.min(Math.max(1, page), this.totalPages()) });
  }

  protected async add() {
    if (await this.#addForm.open()) {
      this.results().reload();
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

    this.isSaving.set(true);

    try {
      await this.#managePlatform.removeBetaTester(tester.id);
      this.results().reload();
      this.#feedback.success(this.#translate.instant('admin.beta_testers.remove_success'));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  #query(queryParams: Record<string, string | number | null>) {
    void this.#router.navigate([], { relativeTo: this.#route, queryParams, queryParamsHandling: 'merge' });
  }
}
