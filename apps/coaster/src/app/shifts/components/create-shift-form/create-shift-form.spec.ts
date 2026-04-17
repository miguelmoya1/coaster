import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateShiftForm } from './create-shift-form';
import { TranslateModule } from '@ngx-translate/core';

describe('CreateShiftForm', () => {
  let component: CreateShiftForm;
  let fixture: ComponentFixture<CreateShiftForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateShiftForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateShiftForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('members', []);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('error', undefined);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
