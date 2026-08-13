import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Loading } from './loading';

describe('Loading', () => {
  let fixture: ComponentFixture<Loading>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Loading] }).compileComponents();

    fixture = TestBed.createComponent(Loading);
    fixture.detectChanges();
  });

  it('should show the horizontal Material bar a page uses', () => {
    const bar = fixture.nativeElement.querySelector('mat-progress-bar');

    expect(bar).toBeTruthy();
    expect(bar.getAttribute('mode')).toBe('indeterminate');
  });

  it('should span the width it is given', () => {
    expect((fixture.nativeElement as HTMLElement).className).toContain('w-full');
  });

  it('should stay quiet when there is nothing to say', () => {
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('should show the text it is given', () => {
    fixture.componentRef.setInput('text', 'Cargando la carta');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando la carta');
  });
});
