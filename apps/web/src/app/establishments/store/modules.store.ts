import { httpResource } from '@angular/common/http';
import { computed, inject, Injector, Service, signal } from '@angular/core';
import type { EstablishmentId, EstablishmentSettings, Language } from '@coaster/common';
import { DEFAULT_ESTABLISHMENT_MODULES, DEFAULT_LANGUAGE, EstablishmentModule, resolveModules } from '@coaster/common';
import { until } from '@coaster/core';
import { EstablishmentRepository } from '../data-access/establishment-repository';
import { EstablishmentSettingsService } from '../services/establishment-settings';

@Service()
export class ModulesStore {
  readonly #settings = inject(EstablishmentSettingsService);
  readonly #repository = inject(EstablishmentRepository);
  readonly #injector = inject(Injector);
  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #settingsResource = httpResource<EstablishmentSettings>(() =>
    this.#settings.execute(this.#currentEstablishmentId()),
  );

  public readonly settings = this.#settingsResource.asReadonly();
  public readonly currentEstablishmentId = this.#currentEstablishmentId.asReadonly();

  public readonly modules = computed<EstablishmentModule[]>(() =>
    this.settings.hasValue()
      ? resolveModules(this.settings.value().modules)
      : resolveModules(DEFAULT_ESTABLISHMENT_MODULES),
  );

  public setEstablishmentId(establishmentId: EstablishmentId | undefined): void {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public loadedFor(establishmentId: EstablishmentId): Promise<void> {
    if (this.#currentEstablishmentId() !== establishmentId) {
      this.#currentEstablishmentId.set(establishmentId);
    }

    return until(
      () => this.#currentEstablishmentId() === establishmentId && !this.#settingsResource.isLoading(),
      this.#injector,
    );
  }

  public isModuleEnabled(module: EstablishmentModule): boolean {
    return this.modules().includes(module);
  }

  public readonly isConfigured = computed<boolean | null>(() =>
    this.settings.hasValue() ? this.settings.value().configuredAt !== null : null,
  );

  public readonly language = computed<Language>(() =>
    this.settings.hasValue() ? this.settings.value().language : DEFAULT_LANGUAGE,
  );

  public readonly markSoldOut = computed(() => (this.settings.hasValue() ? this.settings.value().markSoldOut : false));

  public async save(modules: EstablishmentModule[], language?: Language, markSoldOut?: boolean): Promise<void> {
    const establishmentId = this.#currentEstablishmentId();

    if (!establishmentId) {
      return;
    }

    await this.#repository.updateSettings(establishmentId, { modules, language, markSoldOut });
    this.#settingsResource.reload();
  }
}
