import { Pipe, PipeTransform, inject } from '@angular/core';
import { Order } from '@coaster/common';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'orderTitle',
})
export class OrderTitlePipe implements PipeTransform {
  readonly #translate = inject(TranslateService);

  transform(order: Order | null | undefined) {
    if (!order) {
      return '...';
    }

    if (order.tableName) {
      return order.tableName;
    }

    return this.#translate.instant('orders.bar_order_title');
  }
}
