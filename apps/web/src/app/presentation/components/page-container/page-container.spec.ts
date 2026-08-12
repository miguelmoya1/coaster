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

  it('should give every page the same width', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.className).toContain('max-w-7xl');
  });
});
