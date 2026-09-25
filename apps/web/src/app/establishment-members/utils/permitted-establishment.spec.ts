import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { EstablishmentId } from '@coaster/common';
import { asEstablishmentId, EstablishmentPermission } from '@coaster/common';
import { describe, expect, it } from 'vitest';
import { MyMemberStore } from '../store/my-member.store';
import { permittedEstablishmentId } from './permitted-establishment';

describe('permittedEstablishmentId', () => {
  it('should hand the establishment over only while the member holds the permission', () => {
    const granted = signal(false);
    TestBed.configureTestingModule({
      providers: [{ provide: MyMemberStore, useValue: { hasPermission: () => granted() } }],
    });

    const permitted = TestBed.runInInjectionContext(() =>
      permittedEstablishmentId(
        signal<EstablishmentId | undefined>(asEstablishmentId('establishment-1')),
        EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES,
      ),
    );

    expect(permitted()).toBeUndefined();

    granted.set(true);
    expect(permitted()).toBe('establishment-1');
  });
});
