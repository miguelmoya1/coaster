import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId, Table } from '@coaster/common';
import { asEstablishmentId, asTableId, TableStatus } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tableCounts } from '../utils/table-counts';
import { tablesResource } from './tables.resource';

const establishmentId = asEstablishmentId('establishment-1');
const url = `/establishments/${establishmentId}/tables`;

const table = (id: string, status: TableStatus = TableStatus.FREE): Table =>
  ({ id: asTableId(id), establishmentId, name: `Mesa ${id}`, status }) as Table;

describe('tablesResource', () => {
  let http: HttpTestingController;

  const realtime = {
    tableStatusChanged: signal<Partial<Table> | null>(null),
    tableCreated: signal<Table | null>(null),
    tableUpdated: signal<Table | null>(null),
    tableDeleted: signal<{ id: string } | null>(null),
  };

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });

    http = TestBed.inject(HttpTestingController);
  });

  const loadedWith = async (body: Table[]) => {
    const tables = TestBed.runInInjectionContext(() =>
      tablesResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    http.expectOne(url).flush(body);
    await vi.waitFor(() => expect(tables.hasValue()).toBe(true));
    return tables;
  };

  it('should follow a table as it is occupied and freed', async () => {
    const tables = await loadedWith([table('1')]);

    realtime.tableStatusChanged.set({ id: asTableId('1'), status: TableStatus.OCCUPIED });
    TestBed.tick();

    expect(tables.value()?.[0].status).toBe(TableStatus.OCCUPIED);
  });

  it('should add and remove tables other devices create and delete', async () => {
    const tables = await loadedWith([table('1')]);

    realtime.tableCreated.set(table('2'));
    TestBed.tick();
    realtime.tableDeleted.set({ id: '1' });
    TestBed.tick();

    expect(tables.value()?.map((t) => t.id)).toEqual(['2']);
  });

  it('should count free and occupied tables', () => {
    expect(tableCounts([table('1'), table('2', TableStatus.OCCUPIED), table('3')])).toEqual({
      total: 3,
      free: 2,
      occupied: 1,
    });
  });
});
