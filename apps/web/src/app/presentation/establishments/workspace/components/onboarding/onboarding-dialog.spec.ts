import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EstablishmentModule } from '@coaster/common';
import { CategoriesStore } from '@coaster/categories';
import { ModulesStore } from '@coaster/establishments';
import { ProductsStore } from '@coaster/products';
import { CatalogueStore } from '@coaster/catalogue';
import { provideChildTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingDialog } from './onboarding-dialog';

describe('OnboardingDialog', () => {
  let fixture: ComponentFixture<OnboardingDialog>;
  let component: OnboardingDialog;

  const dialogRefMock = { close: vi.fn() };
  const modulesStoreMock = { save: vi.fn().mockResolvedValue(undefined) };
  const categoriesStoreMock = { reloadCategories: vi.fn() };
  const productsStoreMock = { reloadProducts: vi.fn() };
  const catalogueStoreMock = {
    import: vi.fn().mockResolvedValue(undefined),
  };

  const typeNamed = (key: string) => component['types'].find((type) => type.key === key)!;

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [OnboardingDialog],
      providers: [
        provideChildTranslateService(),
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { establishmentId: 'establishment-1', establishmentName: 'El Bar' } },
        { provide: ModulesStore, useValue: modulesStoreMock },
        { provide: CatalogueStore, useValue: catalogueStoreMock },
        { provide: CategoriesStore, useValue: categoriesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should finish straight away for a business with no inventory, without asking about a catalogue', async () => {
    component['choose'](typeNamed('other'));
    await Promise.resolve();

    expect(modulesStoreMock.save).toHaveBeenCalledWith([EstablishmentModule.TIME_TRACKING]);
    expect(catalogueStoreMock.import).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should ask about the catalogue when the answer brings inventory with it', () => {
    component['choose'](typeNamed('hospitality'));

    expect(component['step']()).toBe('catalogue');
    expect(modulesStoreMock.save).not.toHaveBeenCalled();
  });

  it('should import the standard catalogue when asked to', async () => {
    component['choose'](typeNamed('retail'));
    await component['finish'](true);

    expect(modulesStoreMock.save).toHaveBeenCalledWith([
      EstablishmentModule.TIME_TRACKING,
      EstablishmentModule.INVENTORY,
    ]);
    expect(catalogueStoreMock.import).toHaveBeenCalledWith('establishment-1');
  });

  it('should refresh the catalogue the inventory already loaded', async () => {
    component['choose'](typeNamed('retail'));
    await component['finish'](true);

    expect(categoriesStoreMock.reloadCategories).toHaveBeenCalled();
    expect(productsStoreMock.reloadProducts).toHaveBeenCalled();
  });

  it('should leave the catalogue alone when declined', async () => {
    component['choose'](typeNamed('hospitality'));
    await component['finish'](false);

    expect(catalogueStoreMock.import).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should let the owner go back and change the answer', () => {
    component['choose'](typeNamed('hospitality'));
    component['back']();

    expect(component['step']()).toBe('type');
  });
});
