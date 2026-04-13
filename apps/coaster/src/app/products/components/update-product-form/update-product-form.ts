import { Component, input } from '@angular/core';
import { Product } from '@coaster/interfaces';

@Component({
  selector: 'coaster-update-product-form',
  imports: [],
  template: `<p>update-product-form works!</p>`,
  styles: ``,
})
export class UpdateProductForm {
  readonly product = input.required<Product>();
}
