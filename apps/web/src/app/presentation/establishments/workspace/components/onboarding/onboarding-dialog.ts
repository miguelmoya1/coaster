import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentModule } from '@coaster/common';
import { CategoriesStore } from '@coaster/categories';
import { ModulesStore } from '@coaster/establishments';
import { ProductsStore } from '@coaster/products';
import { CatalogueStore } from '@coaster/catalogue';
import { TranslatePipe } from '@ngx-translate/core';
import { Spinner } from '../../../../components/spinner/spinner';

interface BusinessType {
  key: string;
  labelKey: string;
  descriptionKey: string;
  modules: EstablishmentModule[];
}

export interface OnboardingDialogData {
  establishmentId: EstablishmentId;
  establishmentName: string;
}

@Component({
  selector: 'coaster-onboarding-dialog',
  imports: [Spinner, MatButton, MatIcon, MatDialogActions, MatDialogContent, MatProgressSpinner, TranslatePipe],
  templateUrl: './onboarding-dialog.html',
})
export class OnboardingDialog {
  readonly #dialogRef = inject(MatDialogRef<OnboardingDialog>);
  readonly #modulesStore = inject(ModulesStore);
  readonly #catalogueStore = inject(CatalogueStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #productsStore = inject(ProductsStore);

  protected readonly data = inject<OnboardingDialogData>(MAT_DIALOG_DATA);

  protected readonly types: BusinessType[] = [
    {
      key: 'hospitality',
      labelKey: 'onboarding.type_hospitality',
      descriptionKey: 'onboarding.type_hospitality_desc',
      modules: [EstablishmentModule.TIME_TRACKING, EstablishmentModule.ORDERS, EstablishmentModule.INVENTORY],
    },
    {
      key: 'retail',
      labelKey: 'onboarding.type_retail',
      descriptionKey: 'onboarding.type_retail_desc',
      modules: [EstablishmentModule.TIME_TRACKING, EstablishmentModule.INVENTORY],
    },
    {
      key: 'other',
      labelKey: 'onboarding.type_other',
      descriptionKey: 'onboarding.type_other_desc',
      modules: [EstablishmentModule.TIME_TRACKING],
    },
  ];

  protected readonly chosen = signal<BusinessType | null>(null);
  protected readonly isSaving = signal(false);

  protected readonly asksAboutCatalogue = computed(
    () => this.chosen()?.modules.includes(EstablishmentModule.INVENTORY) ?? false,
  );

  protected readonly step = signal<'type' | 'catalogue'>('type');

  protected choose(type: BusinessType): void {
    this.chosen.set(type);

    if (this.asksAboutCatalogue()) {
      this.step.set('catalogue');
      return;
    }

    void this.finish(false);
  }

  protected back(): void {
    this.step.set('type');
  }

  protected async finish(importCatalogue: boolean): Promise<void> {
    const type = this.chosen();

    if (!type || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      await this.#modulesStore.save(type.modules);

      if (importCatalogue) {
        await this.#catalogueStore.import(this.data.establishmentId);

        this.#categoriesStore.reloadCategories();
        this.#productsStore.reloadProducts();
      }

      this.#dialogRef.close(true);
    } finally {
      this.isSaving.set(false);
    }
  }
}
