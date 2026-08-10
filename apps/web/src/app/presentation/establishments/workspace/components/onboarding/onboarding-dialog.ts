import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentModule } from '@coaster/common';
import { ModulesStore } from '@coaster/establishments';
import { TemplatesStore } from '@coaster/templates';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [MatButton, MatIcon, MatDialogActions, MatDialogContent, MatProgressSpinner, TranslatePipe],
  templateUrl: './onboarding-dialog.html',
})
export class OnboardingDialog {
  readonly #dialogRef = inject(MatDialogRef<OnboardingDialog>);
  readonly #modulesStore = inject(ModulesStore);
  readonly #templatesStore = inject(TemplatesStore);

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

  /** Only worth asking about a catalogue once inventory is actually going to exist. */
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
        const categories = this.#templatesStore.categories;
        const ids = categories.hasValue() ? categories.value().map((category) => category.id) : [];

        if (ids.length > 0) {
          await this.#templatesStore.importToEstablishment(this.data.establishmentId, ids);
        }
      }

      this.#dialogRef.close(true);
    } finally {
      this.isSaving.set(false);
    }
  }
}
