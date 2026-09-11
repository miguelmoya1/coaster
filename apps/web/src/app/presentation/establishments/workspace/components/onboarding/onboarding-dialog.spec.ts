import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DEFAULT_ESTABLISHMENT_MODULES } from '@coaster/common';
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

  it('should configure establishment and import catalogue when chosen', async () => {
    await component['finish'](true);

    expect(modulesStoreMock.save).toHaveBeenCalledWith(DEFAULT_ESTABLISHMENT_MODULES);
    expect(catalogueStoreMock.import).toHaveBeenCalledWith('establishment-1');
    expect(categoriesStoreMock.reloadCategories).toHaveBeenCalled();
    expect(productsStoreMock.reloadProducts).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should configure establishment and leave catalogue empty when starting from scratch', async () => {
    await component['finish'](false);

    expect(modulesStoreMock.save).toHaveBeenCalledWith(DEFAULT_ESTABLISHMENT_MODULES);
    expect(catalogueStoreMock.import).not.toHaveBeenCalled();
    expect(categoriesStoreMock.reloadCategories).not.toHaveBeenCalled();
    expect(productsStoreMock.reloadProducts).not.toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should not allow concurrent finish calls while saving', async () => {
    component['isSaving'].set(true);

    await component['finish'](true);

    expect(modulesStoreMock.save).not.toHaveBeenCalled();
  });
});

