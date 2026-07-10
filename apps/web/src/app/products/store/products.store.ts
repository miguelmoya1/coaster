import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal } from '@angular/core';
import type { BarId, CreateProductDto, ProductId, UpdateProductDto, UpdateProductStockDto } from '@coaster/common';
import { Socket } from '@coaster/core';
import { productArrayMapper, productMapper } from '../mappers/product.mapper';
import { BarProducts } from '../services/bar-products';
import { CreateProduct } from '../services/create-product';
import { DeleteProduct } from '../services/delete-product';
import { UpdateProduct } from '../services/update-product';
import { UpdateProductStock } from '../services/update-product-stock';

@Service()
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
        const mappedCreated = productMapper(created);
        this.#productsResource.update((products) => {
          if (!products) {
            return [mappedCreated];
          }
          const exists = products.some((p) => p.id === mappedCreated.id);
          return exists ? products : [...products, mappedCreated];
        });
      }
    });

    // Product stock changed / updated
    effect(() => {
      const updated = this.#socketService.productStockChanged();
      if (updated) {
        const mappedUpdated = productMapper(updated);
        this.#productsResource.update((products) => {
          if (!products) {
            return undefined;
          }
          return products.map((p) => (p.id === mappedUpdated.id ? mappedUpdated : p));
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

    // Product updated (name, price, category changes)
    effect(() => {
      const updated = this.#socketService.productUpdated();
      if (updated) {
        const mappedUpdated = productMapper(updated);
        this.#productsResource.update((products) => {
          if (!products) {
            return undefined;
          }
          return products.map((p) => (p.id === mappedUpdated.id ? mappedUpdated : p));
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
      return this.#productsResource.value().filter((p) => p.stockStatus === 'WARNING').length ?? 0;
    }

    return undefined;
  });

  public readonly criticalStock = computed(() => {
    if (this.#productsResource.hasValue()) {
      return this.#productsResource.value().filter((p) => p.stockStatus === 'ALERT').length ?? 0;
    }

    return undefined;
  });

  public async create(createProductDto: CreateProductDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      throw new Error('NO_BAR_SELECTED');
    }

    await this.#createProduct.execute(barId, createProductDto);
    this.reloadProducts();
  }

  public async update(productId: ProductId, updateProductDto: UpdateProductDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      throw new Error('NO_BAR_SELECTED');
    }

    await this.#updateProduct.execute(barId, productId, updateProductDto);
    this.#productsResource.update((products) => {
      if (!products) {
        return undefined;
      }
      return products.map((p) => (p.id === productId ? productMapper({ ...p, ...updateProductDto }) : p));
    });
  }

  public async updateStock(productId: ProductId, updateProductStockDto: UpdateProductStockDto) {
    const barId = this.#currentBarId();
    if (!barId) {
      throw new Error('NO_BAR_SELECTED');
    }

    await this.#updateProductStock.execute(barId, productId, updateProductStockDto);
    this.#productsResource.update((products) => {
      if (!products) {
        return undefined;
      }
      return products.map((p) => (p.id === productId ? productMapper({ ...p, ...updateProductStockDto }) : p));
    });
  }

  public async delete(productId: ProductId) {
    const barId = this.#currentBarId();
    if (!barId) {
      throw new Error('NO_BAR_SELECTED');
    }

    await this.#deleteProduct.execute(barId, productId);
    this.#productsResource.update((products) => {
      if (!products) {
        return undefined;
      }
      return products.filter((p) => p.id !== productId);
    });
  }
}
