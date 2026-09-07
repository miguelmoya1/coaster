import { Component, inject, signal } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import type { EstablishmentId } from '@coaster/common';
import { DEFAULT_ESTABLISHMENT_MODULES } from '@coaster/common';
import { CategoriesStore } from '@coaster/categories';
import { ModulesStore } from '@coaster/establishments';
import { ProductsStore } from '@coaster/products';
import { CatalogueStore } from '@coaster/catalogue';
import { TranslatePipe } from '@ngx-translate/core';
import { Spinner } from '../../../../components/spinner/spinner';

export interface OnboardingDialogData {
  establishmentId: EstablishmentId;
  establishmentName: string;
}

@Component({
  selector: 'coaster-onboarding-dialog',
  imports: [Spinner, MatIcon, MatDialogContent, MatDialogTitle, TranslatePipe],
  templateUrl: './onboarding-dialog.html',
})
export class OnboardingDialog {
  readonly #dialogRef = inject(MatDialogRef<OnboardingDialog>);
  readonly #modulesStore = inject(ModulesStore);
  readonly #catalogueStore = inject(CatalogueStore);
  readonly #categoriesStore = inject(CategoriesStore);
  readonly #productsStore = inject(ProductsStore);

  protected readonly data = inject<OnboardingDialogData>(MAT_DIALOG_DATA);
  protected readonly isSaving = signal(false);

  protected async finish(importCatalogue: boolean): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      await this.#modulesStore.save(DEFAULT_ESTABLISHMENT_MODULES);

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
