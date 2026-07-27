import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageContainer } from './page-container';

describe('PageContainer', () => {
  let component: PageContainer;
  let fixture: ComponentFixture<PageContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageContainer],
    }).compileComponents();

    fixture = TestBed.createComponent(PageContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply lg max-w by default to host element', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.className).toContain('max-w-7xl');
  });

  it('should change max-w class when size input changes', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.className).toContain('max-w-xl');
  });
});
