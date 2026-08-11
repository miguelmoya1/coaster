import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentModule, resolveModules } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { ModulesStore } from '@coaster/establishments';
import { environment } from '@coaster/env';
import { PrinterRepository } from '@coaster/printer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Loading } from '../../../../components/loading/loading';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';

interface ModuleRow {
  module: EstablishmentModule;
  labelKey: string;
  descriptionKey: string;
  locked: boolean;
}

@Component({
  selector: 'coaster-settings',
  imports: [Loading, MatButton, MatIcon, MatSlideToggle, TranslatePipe, PageContainer, PageHeader],
  templateUrl: './settings.html',
  host: { class: 'block w-full flex-1' },
})
export default class Settings {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #modulesStore = inject(ModulesStore);
  readonly #feedback = inject(ActionFeedback);
  readonly #printerRepository = inject(PrinterRepository);
  readonly #translate = inject(TranslateService);

  protected readonly settings = this.#modulesStore.settings;
  protected readonly isSaving = signal(false);
  protected readonly draft = signal<EstablishmentModule[] | null>(null);

  protected readonly rows: ModuleRow[] = [
    {
      module: EstablishmentModule.TIME_TRACKING,
      labelKey: 'settings.module_time_tracking',
      descriptionKey: 'settings.module_time_tracking_desc',
      locked: true,
    },
    {
      module: EstablishmentModule.ORDERS,
      labelKey: 'settings.module_orders',
      descriptionKey: 'settings.module_orders_desc',
      locked: false,
    },
    {
      module: EstablishmentModule.INVENTORY,
      labelKey: 'settings.module_inventory',
      descriptionKey: 'settings.module_inventory_desc',
      locked: false,
    },
  ];

  protected readonly selected = computed(() => this.draft() ?? this.#modulesStore.modules());

  protected isOn(module: EstablishmentModule): boolean {
    return this.selected().includes(module);
  }

  /**
   * Toggling orders on brings inventory with it, and the screen shows that immediately rather than
   * letting the server surprise the owner after they save.
   */
  protected toggle(module: EstablishmentModule, on: boolean): void {
    const without = this.selected().filter((candidate) => candidate !== module);
    this.draft.set(resolveModules(on ? [...without, module] : without));
  }

  protected isForcedByOrders(module: EstablishmentModule): boolean {
    return (
      module === EstablishmentModule.INVENTORY &&
      this.selected().includes(EstablishmentModule.ORDERS) &&
      this.isOn(module)
    );
  }

  protected readonly isPairing = signal(false);
  protected readonly pairingCode = signal<string | null>(null);

  /**
   * The code travels in the file name, so the customer never has to read it. It is shown anyway for
   * the run where that fails — a renamed download, a browser that appends "(1)" — and the bridge
   * asks for it on its own local page.
   */
  protected async downloadBridge(os: 'windows' | 'linux'): Promise<void> {
    if (this.isPairing()) {
      return;
    }

    this.isPairing.set(true);

    try {
      const { code } = await this.#printerRepository.issuePairing(this.establishmentId());
      this.pairingCode.set(code);

      window.location.assign(`${environment.apiUrl}/api/v1/printer/download?os=${os}&code=${code}`);
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isPairing.set(false);
    }
  }

  protected async save(): Promise<void> {
    this.isSaving.set(true);

    try {
      await this.#modulesStore.save(this.selected());
      this.draft.set(null);
      this.#feedback.success(this.#translate.instant('settings.saved'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
