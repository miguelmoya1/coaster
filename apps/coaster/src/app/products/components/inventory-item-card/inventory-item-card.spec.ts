import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItemCard } from './inventory-item-card';

describe.skip('InventoryItemCard', () => {
  let component: InventoryItemCard;
  let fixture: ComponentFixture<InventoryItemCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItemCard],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryItemCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('itemName', 'Test Item');
    fixture.componentRef.setInput('locationText', 'Test Location');
    fixture.componentRef.setInput('qty', 10);
    fixture.componentRef.setInput('statusLevel', 'good');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
