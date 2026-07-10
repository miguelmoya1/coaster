import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId, CreateTableDto, TableId, UpdateTableDto } from '@coaster/common';
import { ErrorCodes, TableStatus } from '@coaster/common';
import { Socket } from '@coaster/core';
import { tableArrayMapper } from '../mappers/table.mapper';
import { BarTables } from '../services/bar-tables';
import { CreateTable } from '../services/create-table';
import { DeleteTable } from '../services/delete-table';
import { UpdateTable } from '../services/update-table';

@Service()
export class TablesStore {
  readonly #barTables = inject(BarTables);
  readonly #createTable = inject(CreateTable);
  readonly #deleteTable = inject(DeleteTable);
  readonly #updateTable = inject(UpdateTable);
  readonly #socketService = inject(Socket);

  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #currentTableId = signal<TableId | undefined>(undefined);

  readonly #listResource = httpResource(() => this.#barTables.execute(this.#currentBarId()), {
    parse: tableArrayMapper,
  });

  public readonly tables = this.#listResource.asReadonly();
  public readonly currentTableId = this.#currentTableId.asReadonly();

  public readonly total = computed(() => {
    if (this.#listResource.hasValue()) {
      return this.#listResource.value()?.length ?? 0;
    }
    return undefined;
  });

  public readonly freeCount = computed(() => {
    if (this.#listResource.hasValue()) {
      return this.#listResource.value()?.filter((t) => t.status === TableStatus.FREE).length ?? 0;
    }
    return undefined;
  });

  public readonly occupiedCount = computed(() => {
    if (this.#listResource.hasValue()) {
      return this.#listResource.value()?.filter((t) => t.status === TableStatus.OCCUPIED).length ?? 0;
    }
    return undefined;
  });

  constructor() {
    effect(() => {
      const payload = this.#socketService.tableStatusChanged();
      if (payload && payload.id) {
        this.#listResource.update((tables) => {
          if (!tables) {
            return undefined;
          }
          return tables.map((t) => (t.id === payload.id ? { ...t, ...payload } : t));
        });
      }
    });

    // Table created
    effect(() => {
      const created = this.#socketService.tableCreated();
      if (created && this.#currentBarId() === created.barId) {
        this.#listResource.update((tables) => {
          if (!tables) {
            return [created];
          }
          const exists = tables.some((t) => t.id === created.id);
          return exists ? tables : [...tables, created];
        });
      }
    });

    // Table updated
    effect(() => {
      const updated = this.#socketService.tableUpdated();
      if (updated && this.#currentBarId() === updated.barId) {
        this.#listResource.update((tables) => {
          if (!tables) {
            return undefined;
          }
          return tables.map((t) => (t.id === updated.id ? updated : t));
        });
      }
    });

    // Table deleted
    effect(() => {
      const deleted = this.#socketService.tableDeleted();
      if (deleted) {
        this.#listResource.update((tables) => {
          if (!tables) {
            return undefined;
          }
          return tables.filter((t) => t.id !== deleted.id);
        });
      }
    });
  }

  public reload() {
    this.#listResource.reload();
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public setTableId(tableId: TableId | undefined) {
    this.#currentTableId.set(tableId);
  }

  public async create(createTableDto: CreateTableDto) {
    const barId = this.#currentBarId();

    if (!barId) {
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }
    await this.#createTable.execute(barId, createTableDto);
    this.reload();
  }

  public async delete(tableId: TableId) {
    const barId = this.#currentBarId();

    if (!barId) {
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }
    await this.#deleteTable.execute(barId, tableId);
    this.#listResource.update((tables) => {
      if (!tables) {
        return undefined;
      }
      return tables.filter((t) => t.id !== tableId);
    });
  }

  public async update(tableId: TableId, updateTableDto: UpdateTableDto) {
    const barId = this.#currentBarId();

    if (!barId) {
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }
    await this.#updateTable.execute(barId, tableId, updateTableDto);
    this.#listResource.update((tables) => {
      if (!tables) {
        return undefined;
      }
      return tables.map((t) => (t.id === tableId ? { ...t, ...updateTableDto } : t));
    });
  }
}
