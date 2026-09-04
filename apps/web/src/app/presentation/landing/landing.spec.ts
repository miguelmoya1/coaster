import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import Landing from './landing';

describe('Landing', () => {
  let fixture: ComponentFixture<Landing>;
  let component: Landing;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideTranslateService(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('the price examples on the public page', () => {
    const priceFor = (staff: number) => component['priceExamples'].find((row) => row.staff === staff)?.price;

    it('should charge the flat price for any team inside the allowance', () => {
      expect(priceFor(5)).toBe('19,99\u00A0€');
      expect(priceFor(10)).toBe('19,99\u00A0€');
    });

    it('should add two euros per employee past the tenth', () => {
      expect(priceFor(12)).toBe('23,99\u00A0€');
      expect(priceFor(20)).toBe('39,99\u00A0€');
    });

    it('should never show a team the price of a smaller one', () => {
      const amounts = component['priceExamples'].map((row) => row.price);

      expect(new Set(amounts).size).toBeGreaterThan(1);
      expect(amounts).toHaveLength(4);
    });
  });

  it('should render the pricing section the header links to', () => {
    expect(fixture.nativeElement.querySelector('#precios')).toBeTruthy();
  });
});
