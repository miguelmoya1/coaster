import { Component, computed, inject, input, inputBinding, outputBinding, signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import { ManageCategories } from '@coaster/categories';
import type { EstablishmentId, Category } from '@coaster/common';
import { EstablishmentPermission, grossFromNet } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { ManageProducts, stockCounts, type Product } from '@coaster/products';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoryFilter } from '../../../../components/category-filter/category-filter';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import { ResourceStatus } from '../../../../components/resource-status/resource-status';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';
import { StatCard } from '../../../../components/stat-card/stat-card';
import { Fab } from '../../components/fab/fab';
import { InventoryItemCard } from '../../components/inventory-item-card/inventory-item-card';
import { CreateInventorySheet } from './components/create-inventory-sheet/create-inventory-sheet';
import { EditCategoryForm } from './components/edit-category-form/edit-category-form';
import { InventorySearch } from './components/inventory-search/inventory-search';
import { UpdateProductForm } from './components/update-product-form/update-product-form';
import { UpdateStockProductForm } from './components/update-stock-product-form/update-stock-product-form';

@Component({
  selector: 'coaster-inventory',
  imports: [
    CategoryFilter,
    InventoryItemCard,
    ResourceStatus,
    StatCard,
    RouterLink,
    TranslatePipe,
    MatIcon,
    MatButton,
    InventorySearch,
    Fab,
    PageContainer,
    PageHeader,
    RequireSubscriptionDirective,
  ],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  templateUrl: './inventory.html',
  styles: `
    .product {
      content-visibility: auto;
      contain-intrinsic-size: 100px;
    }
  `,
})
export default class Inventory {
  protected grossOf(product: Product): number {
    return grossFromNet(product.price, product.taxRate);
  }

  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly products = input.required<PageResource<Product[]>>();
  public readonly categories = input.required<PageResource<Category[]>>();

  readonly #myMemberStore = inject(MyMemberStore);

  protected readonly canImportCatalogue = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_IMPORT_CATALOGUE),
  );
  protected readonly canManageMenu = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_MENU),
  );
  protected readonly canUpdateCategory = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_UPDATE_CATEGORY),
  );
  protected readonly canUpdateProduct = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_UPDATE_PRODUCT),
  );
  protected readonly canCreateProduct = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_CREATE_PRODUCT),
  );

  readonly #manageProducts = inject(ManageProducts);
  readonly #manageCategories = inject(ManageCategories);
  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);

  readonly #confirmation = inject(ConfirmationDialog);
  readonly #bottomSheet = inject(MatBottomSheet);

  readonly isSubmitting = signal(false);
  readonly selectedCategoryId = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  protected readonly categoryList = computed(() => loadedOr(this.categories(), []));
  protected readonly counts = computed(() => stockCounts(loadedOr(this.products(), [])));

  readonly filteredProducts = computed(() => {
    let allProducts = loadedOr(this.products(), []);
    const categoryId = this.selectedCategoryId();

    if (categoryId !== 'ALL') {
      allProducts = allProducts.filter((p) => p.categoryId === categoryId);
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      allProducts = allProducts.filter((p) => p.name.toLowerCase().includes(query));
    }

    return [...allProducts].sort((a, b) => {
      const nameA = this.#translate.instant(a.name) || a.name;
      const nameB = this.#translate.instant(b.name) || b.name;
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  });

  onCreateInventoryClicked() {
    const bottomSheetRef = this.#bottomSheet.open(CreateInventorySheet, {
      disableClose: true,
      bindings: [
        inputBinding('establishmentId', () => this.establishmentId()),
        inputBinding('categories', () => this.categoryList()),
        outputBinding('canceled', () => {
          bottomSheetRef.dismiss();
        }),
        outputBinding('created', () => {
          bottomSheetRef.dismiss();
          this.products().reload();
          this.categories().reload();
        }),
      ],
    });
  }

  onProductClicked(product: Product) {
    const bottomSheetRef = this.#bottomSheet.open(UpdateStockProductForm, {
      bindings: [
        inputBinding('establishmentId', () => this.establishmentId()),
        inputBinding('product', () => product),
        outputBinding('updated', () => {
          bottomSheetRef.dismiss();
          this.products().reload();
        }),
        outputBinding('canceled', () => {
          bottomSheetRef.dismiss();
        }),
      ],
    });
  }

  onEditProductClicked(product: Product) {
    const bottomSheetRef = this.#bottomSheet.open(UpdateProductForm, {
      bindings: [
        inputBinding('establishmentId', () => this.establishmentId()),
        inputBinding('product', () => product),
        inputBinding('categories', () => this.categoryList()),
        outputBinding('edited', () => {
          bottomSheetRef.dismiss();
          this.products().reload();
        }),
        outputBinding('canceled', () => {
          bottomSheetRef.dismiss();
        }),
      ],
    });
  }

  onEditCategoryClicked(categoryId: string) {
    const targetId = categoryId || this.selectedCategoryId();
    if (targetId === 'ALL') return;
    const cat = this.categoryList().find((c) => c.id === targetId);
    if (cat) {
      const bottomSheetRef = this.#bottomSheet.open(EditCategoryForm, {
        bindings: [
          inputBinding('establishmentId', () => this.establishmentId()),
          inputBinding('category', () => cat),
          outputBinding('updated', () => {
            bottomSheetRef.dismiss();
            this.categories().reload();
          }),
          outputBinding('canceled', () => {
            bottomSheetRef.dismiss();
          }),
          outputBinding('deleted', () => {
            bottomSheetRef.dismiss();
            this.handleDeleteCategoryClicked(cat);
          }),
        ],
      });
    }
  }

  protected async handleDeleteProductClicked(product: Product) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('inventory.delete_product.title'),
      text: this.#translate.instant('inventory.delete_product.message', { name: product.name }),
    });

    if (!confirmed) return;

    try {
      await this.#manageProducts.delete(this.establishmentId(), product.id);
      this.products().reload();
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async handleDeleteCategoryClicked(category: Category) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('inventory.delete_category.title'),
      text: this.#translate.instant('inventory.delete_category.message', { name: category.name }),
    });

    if (!confirmed) return;

    this.selectedCategoryId.set('ALL');
    try {
      await this.#manageCategories.delete(this.establishmentId(), category.id);
      this.categories().reload();
    } catch (error) {
      this.#feedback.error(error);
    }
  }
}
