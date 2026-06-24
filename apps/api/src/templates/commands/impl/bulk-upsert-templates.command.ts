export interface BulkCategoryTemplateInput {
  name: string;
  icon?: string;
  products?: {
    name: string;
    price: number;
  }[];
}

export class BulkUpsertTemplatesCommand {
  constructor(public readonly categoriesJson: BulkCategoryTemplateInput[]) {}
}
