import { beforeEach, describe, expect, it, test } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvatarBadge } from './avatar-badge';

describe('AvatarBadge', () => {
  let component: AvatarBadge;
  let fixture: ComponentFixture<AvatarBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(AvatarBadge);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('imageSrc', 'test.jpg');
    fixture.componentRef.setInput('altText', 'Test');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
