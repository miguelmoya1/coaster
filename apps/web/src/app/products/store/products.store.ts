import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { BarId, CreateProductDto, ProductId, UpdateProductDto, UpdateProductStockDto } from '@coaster/common';
import { handleErrorFormField, Socket } from '@coaster/core';
import { productArrayMapper } from '../mappers/product.mapper';
import { BarProducts } from '../services/bar-products';
import { CreateProduct } from '../services/create-product';
import { DeleteProduct } from '../services/delete-product';
import { UpdateProduct } from '../services/update-product';
import { UpdateProductStock } from '../services/update-product-stock';

@Injectable({
  providedIn: 'root',
})
export class ProductsStore {
  readonly #barProducts = inject(BarProducts);
  readonly #createProduct = inject(CreateProduct);
  readonly #updateProduct = inject(UpdateProduct);
  readonly #updateProductStock = inject(UpdateProductStock);
  readonly #deleteProduct = inject(DeleteProduct);
  readonly #socketService = inject(Socket);

  readonly #currentBarId = signal<BarId | null>(null);

  readonly #productsResource = httpResource(() => this.#barProducts.execute(this.#currentBarId()), {
    parse: (products) => productArrayMapper(products),
  });

  readonly list = this.#productsResource.asReadonly();

  constructor() {
    // Product created
    effect(() => {
      const created = this.#socketService.productCreated();
      if (created) {
        this.#productsResource.update((products) => {
          if (!products) {
            return [created];
          }
          const exists = products.some((p) => p.id === created.id);
          return exists ? products : [...products, created];
        });
      }
    });

    // Product stock changed / updated
    effect(() => {
      const updated = this.#socketService.productStockChanged();
      if (updated) {
        this.#productsResource.update((products) => {
          if (!products) {
            return undefined;
          }
          return products.map((p) => (p.id === updated.id ? updated : p));
        });
      }
    });

    // Product deleted
    effect(() => {
      const deleted = this.#socketService.productDeleted();
      if (deleted) {
        this.#productsResource.update((products) => {
          if (!products) {
            return undefined;
          }
          return products.filter((p) => p.id !== deleted.id);
        });
      }
    });
  }

  public setBarId(barId: BarId | null) {
    this.#currentBarId.set(barId);
  }

  public reloadProducts() {
    this.#productsResource.reload();
  }

  public readonly total = computed(() => {
    if (this.#productsResource.hasValue()) {
      return this.#productsResource.value().length ?? 0;
    }

    return undefined;
  });

  public readonly lowStock = computed(() => {
    if (this.#productsResource.hasValue()) {
      return this.#productsResource.value().filter((p) => p.stockStatus === 'low').length ?? 0;
    }

    return undefined;
  });

  public readonly criticalStock = computed(() => {
    if (this.#productsResource.hasValue()) {
      return this.#productsResource.value().filter((p) => p.stockStatus === 'critical').length ?? 0;
    }

    return undefined;
  });

  public async create(createProductDto: CreateProductDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      return handleErrorFormField('NO_BAR_SELECTED');
    }

    try {
      const product = await this.#createProduct.execute(barId, createProductDto);

      this.#productsResource.update((products) => {
        if (!products) {
          return [product];
        }
        const exists = products.some((p) => p.id === product.id);
        return exists ? products : [...products, product];
      });
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async update(productId: ProductId, updateProductDto: UpdateProductDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      return handleErrorFormField('NO_BAR_SELECTED');
    }

    try {
      const product = await this.#updateProduct.execute(barId, productId, updateProductDto);

      if (!this.#productsResource.hasValue()) {
        this.#productsResource.set([product]);
        return null;
      }

      const products = this.#productsResource.value();

      if (!products) {
        this.#productsResource.set([product]);
        return null;
      }

      this.#productsResource.set(products.map((p) => (p.id === productId ? product : p)));
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async updateStock(productId: ProductId, updateProductStockDto: UpdateProductStockDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      return handleErrorFormField('NO_BAR_SELECTED');
    }

    try {
      const product = await this.#updateProductStock.execute(barId, productId, updateProductStockDto);

      if (!this.#productsResource.hasValue()) {
        this.#productsResource.set([product]);
        return null;
      }

      const products = this.#productsResource.value();

      if (!products) {
        this.#productsResource.set([product]);
        return null;
      }

      this.#productsResource.set(products.map((p) => (p.id === productId ? product : p)));
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async delete(productId: ProductId) {
    const barId = this.#currentBarId();
    if (!barId) {
      return handleErrorFormField('NO_BAR_SELECTED');
    }

    try {
      await this.#deleteProduct.execute(barId, productId);

      if (!this.#productsResource.hasValue()) {
        return null;
      }

      const products = this.#productsResource.value();

      if (!products) {
        return null;
      }

      this.#productsResource.set(products.filter((p) => p.id !== productId));
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
