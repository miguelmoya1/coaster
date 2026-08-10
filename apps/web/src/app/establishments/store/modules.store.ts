import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { EstablishmentId, EstablishmentSettings } from '@coaster/common';
import { DEFAULT_ESTABLISHMENT_MODULES, EstablishmentModule, resolveModules } from '@coaster/common';
import { EstablishmentSettingsService } from '../services/establishment-settings';

@Service()
export class ModulesStore {
  readonly #settings = inject(EstablishmentSettingsService);
  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #settingsResource = httpResource<EstablishmentSettings>(() =>
    this.#settings.execute(this.#currentEstablishmentId()),
  );

  public readonly settings = this.#settingsResource.asReadonly();
  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();

  /**
   * Everything on until the answer arrives. The alternative hides the menu on every page load and
   * then pops it back, which reads as the app losing features for a moment.
   */
  public readonly modules = computed<EstablishmentModule[]>(() =>
    this.settings.hasValue()
      ? resolveModules(this.settings.value().modules)
      : resolveModules(DEFAULT_ESTABLISHMENT_MODULES),
  );

  public setEstablishmentId(establishmentId: EstablishmentId | undefined): void {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public isModuleEnabled(module: EstablishmentModule): boolean {
    return this.modules().includes(module);
  }
}
