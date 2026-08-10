import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstablishmentModule } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { ModulesStore } from '@coaster/establishments';
import { provideChildTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './settings';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let component: Settings;

  const modules = signal<EstablishmentModule[]>([EstablishmentModule.TIME_TRACKING]);
  const modulesStoreMock = {
    settings: { isLoading: signal(false).asReadonly(), hasValue: () => true, value: () => ({ modules: modules() }) },
    modules,
    save: vi.fn().mockResolvedValue(undefined),
    isModuleEnabled: vi.fn((module: EstablishmentModule) => modules().includes(module)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    modules.set([EstablishmentModule.TIME_TRACKING]);

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideChildTranslateService(),
        { provide: ModulesStore, useValue: modulesStoreMock },
        { provide: ActionFeedback, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should start from what the establishment already runs', () => {
    expect(component['isOn'](EstablishmentModule.TIME_TRACKING)).toBe(true);
    expect(component['isOn'](EstablishmentModule.ORDERS)).toBe(false);
  });

  it('should bring inventory along when orders is switched on, before anything is saved', () => {
    component['toggle'](EstablishmentModule.ORDERS, true);

    expect(component['isOn'](EstablishmentModule.INVENTORY)).toBe(true);
    expect(component['isForcedByOrders'](EstablishmentModule.INVENTORY)).toBe(true);
  });

  it('should keep time tracking on even if something asks to remove it', () => {
    component['toggle'](EstablishmentModule.TIME_TRACKING, false);

    expect(component['isOn'](EstablishmentModule.TIME_TRACKING)).toBe(true);
  });

  it('should let inventory go on its own once orders is off again', () => {
    component['toggle'](EstablishmentModule.ORDERS, true);
    component['toggle'](EstablishmentModule.ORDERS, false);
    component['toggle'](EstablishmentModule.INVENTORY, false);

    expect(component['isOn'](EstablishmentModule.INVENTORY)).toBe(false);
  });

  it('should save what is on screen', async () => {
    component['toggle'](EstablishmentModule.ORDERS, true);

    await component['save']();

    expect(modulesStoreMock.save).toHaveBeenCalledWith([
      EstablishmentModule.TIME_TRACKING,
      EstablishmentModule.ORDERS,
      EstablishmentModule.INVENTORY,
    ]);
  });
});
