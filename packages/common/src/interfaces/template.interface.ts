export interface ICategoryTemplate {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProductTemplate {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IImportTemplatesResponse {
  success: boolean;
  created: number;
  modified: number;
}
