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

export interface ImportStarterCatalogueDto {
  categoryKeys?: string[];
}
