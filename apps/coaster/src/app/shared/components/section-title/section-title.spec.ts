import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionTitle } from './section-title';

describe('SectionTitle', () => {
  let component: SectionTitle;
  let fixture: ComponentFixture<SectionTitle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionTitle],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionTitle);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render an H2 by default', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')).toBeTruthy();
    expect(compiled.querySelector('h1')).toBeFalsy();
    expect(compiled.querySelector('h2')?.textContent?.trim()).toBe('Test Title');
  });

  it('should render an H1 when isH1 is true', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.componentRef.setInput('isH1', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')).toBeTruthy();
    expect(compiled.querySelector('h2')).toBeFalsy();
  });

  it('should render a description when provided', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const p = compiled.querySelector('p');
    expect(p).toBeTruthy();
    expect(p?.textContent?.trim()).toBe('Test Description');
  });

  it('should append border-b class when there is no description', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const h2 = compiled.querySelector('h2');
    expect(h2?.classList.contains('border-b')).toBe(true);
  });

  it('should NOT append border-b class when there is a description', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.componentRef.setInput('description', 'Test Description');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const h2 = compiled.querySelector('h2');
    expect(h2?.classList.contains('border-b')).toBe(false);
  });

  it('should apply centering classes when centered is true', () => {
    fixture.componentRef.setInput('heading', 'Test Title');
    fixture.componentRef.setInput('centered', true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const wrapper = compiled.querySelector('div');
    expect(wrapper?.classList.contains('items-center')).toBe(true);
    expect(wrapper?.classList.contains('text-center')).toBe(true);
  });
});
