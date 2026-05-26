import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { BarId, CreateTableDto, TableId, TableStatus, UpdateTableDto } from '@coaster/common';
import { handleErrorFormField, Socket } from '@coaster/core';
import { tableArrayMapper } from '../mappers/table.mapper';
import { BarTables } from '../services/bar-tables';
import { CreateTable } from '../services/create-table';
import { DeleteTable } from '../services/delete-table';
import { UpdateTable } from '../services/update-table';

@Injectable({
  providedIn: 'root',
})
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
      return handleErrorFormField('NO_BAR_SELECTED');
    }
    try {
      const created = await this.#createTable.execute(barId, createTableDto);
      this.#listResource.update((tables) => {
        if (!tables) {
          return [created];
        }
        const exists = tables.some((t) => t.id === created.id);
        return exists ? tables : [...tables, created];
      });
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async delete(tableId: TableId) {
    const barId = this.#currentBarId();

    if (!barId) {
      return handleErrorFormField('NO_BAR_SELECTED');
    }
    try {
      await this.#deleteTable.execute(barId, tableId);
      this.#listResource.update((tables) => {
        if (!tables) {
          return undefined;
        }
        return tables.filter((t) => t.id !== tableId);
      });
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async update(tableId: TableId, updateTableDto: UpdateTableDto) {
    const barId = this.#currentBarId();

    if (!barId) {
      return handleErrorFormField('NO_BAR_SELECTED');
    }
    try {
      const updated = await this.#updateTable.execute(barId, tableId, updateTableDto);
      this.#listResource.update((tables) => {
        if (!tables) {
          return undefined;
        }
        return tables.map((t) => (t.id === updated.id ? updated : t));
      });
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
