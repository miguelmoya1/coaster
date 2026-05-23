export interface ICategoryTemplate {
  id: string;
  name: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductTemplate {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IImportTemplatesResponse {
  success: boolean;
  created: number;
  modified: number;
}
