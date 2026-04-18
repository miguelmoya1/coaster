import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { TranslateModule } from '@ngx-translate/core';
import { BarCard } from './bar-card';

describe('BarCard', () => {
  let component: BarCard;
  let fixture: ComponentFixture<BarCard>;

  const mockBar: Bar = {
    id: asBarId('bar-123'),
    name: 'The Rusty Anchor',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarCard, TranslateModule.forRoot()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(BarCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('bar', mockBar);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the bar name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain(mockBar.name);
  });

  it('should contain the bar role badge', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('coaster-bar-role-badge')).toBeTruthy();
  });
});
