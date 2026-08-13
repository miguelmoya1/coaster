import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { QrCode } from './qr-code';

describe('QrCode', () => {
  let fixture: ComponentFixture<QrCode>;

  const render = async (value: string, size?: number) => {
    fixture = TestBed.createComponent(QrCode);
    fixture.componentRef.setInput('value', value);

    if (size) {
      fixture.componentRef.setInput('size', size);
    }

    fixture.detectChanges();
    await fixture.whenStable();

    return fixture.nativeElement.querySelector('svg') as SVGElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [QrCode] }).compileComponents();
  });

  it('should draw an svg rather than a canvas, so printing it does not blur', async () => {
    const svg = await render('https://coaster.business/m/bar-pepe');

    expect(svg).toBeTruthy();
    expect(svg.querySelector('path')?.getAttribute('d')).toBeTruthy();
  });

  it('should honour the size asked for', async () => {
    const svg = await render('https://coaster.business/m/bar-pepe', 240);

    expect(svg.getAttribute('width')).toBe('240');
    expect(svg.getAttribute('viewBox')).toBe('0 0 240 240');
  });

  it('should encode a longer address into a denser code rather than fail', async () => {
    const short = await render('https://coaster.business/m/a');
    const long = await render(`https://coaster.business/m/${'x'.repeat(120)}`);

    expect(long.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(
      short.querySelector('path')?.getAttribute('d')?.length ?? 0,
    );
  });

  it('should redraw when the address changes', async () => {
    await render('https://coaster.business/m/one');
    const first = fixture.nativeElement.querySelector('path').getAttribute('d');

    fixture.componentRef.setInput('value', 'https://coaster.business/m/two');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('path').getAttribute('d')).not.toBe(first);
  });
});
