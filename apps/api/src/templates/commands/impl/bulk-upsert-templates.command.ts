export interface BulkCategoryTemplateInput {
  name: string;
  icon?: string;
  products?: {
    name: string;
    price: number;
    imageUrl?: string;
  }[];
}

export class BulkUpsertTemplatesCommand {
  constructor(public readonly categoriesJson: BulkCategoryTemplateInput[]) {}
}
