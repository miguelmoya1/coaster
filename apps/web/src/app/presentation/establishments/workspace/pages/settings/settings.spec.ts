import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstablishmentModule } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { ModulesStore } from '@coaster/establishments';
import { PrinterRepository } from '@coaster/printer';
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

  const feedbackMock = { success: vi.fn(), error: vi.fn() };
  const printerRepositoryMock = { issuePairing: vi.fn().mockResolvedValue({ code: '7F3KB92X' }) };

  beforeEach(async () => {
    vi.clearAllMocks();
    modules.set([EstablishmentModule.TIME_TRACKING]);

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideChildTranslateService(),
        { provide: ModulesStore, useValue: modulesStoreMock },
        { provide: ActionFeedback, useValue: feedbackMock },
        { provide: PrinterRepository, useValue: printerRepositoryMock },
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

  /*
   * The navigation itself is one line of window.location and jsdom will not let it be spied on;
   * contorting the component to make it observable would cost more than the assertion is worth.
   * What matters is that a code is minted, shown, and not minted twice.
   */
  describe('the printer bridge', () => {
    it('should mint a code, which is how the bridge learns where it belongs', async () => {
      await component['downloadBridge']('windows');

      expect(printerRepositoryMock.issuePairing).toHaveBeenCalledWith('establishment-1');
    });

    it('should show the code as well, for the download whose name got mangled', async () => {
      await component['downloadBridge']('linux');

      expect(component['pairingCode']()).toBe('7F3KB92X');
    });

    it('should not ask for a second code while the first is still on its way', async () => {
      component['isPairing'].set(true);

      await component['downloadBridge']('windows');

      expect(printerRepositoryMock.issuePairing).not.toHaveBeenCalled();
    });

    it('should report a refusal instead of failing silently', async () => {
      printerRepositoryMock.issuePairing.mockRejectedValueOnce(new Error('nope'));

      await component['downloadBridge']('windows');

      expect(feedbackMock.error).toHaveBeenCalled();
      expect(component['pairingCode']()).toBeNull();
    });
  });
});
