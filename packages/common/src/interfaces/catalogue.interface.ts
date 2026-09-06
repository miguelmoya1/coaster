export interface StarterCatalogueProduct {
  name: string;
  price: number;
  icon: string;
  taxRate?: number;
}

export interface StarterCatalogueCategory {
  key: string;
  name: string;
  icon?: string;
  taxRate: number;
  products: StarterCatalogueProduct[];
}

export interface ImportStarterCatalogueDto {
  categoryKeys?: string[];
}
