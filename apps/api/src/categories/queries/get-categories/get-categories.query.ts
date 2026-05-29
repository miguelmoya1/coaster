import { BarId } from '@coaster/common';

export class GetCategoriesQuery {
  constructor(public readonly barId: BarId) {}
}
