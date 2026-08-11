export interface StarterCatalogueProduct {
  name: string;
  price: number;
}

export interface StarterCatalogueCategory {
  key: string;
  name: string;
  icon?: string;
  products: StarterCatalogueProduct[];
}

/** No selection means the whole starter catalogue, which is what a new establishment asks for. */
export interface ImportStarterCatalogueDto {
  categoryKeys?: string[];
}
