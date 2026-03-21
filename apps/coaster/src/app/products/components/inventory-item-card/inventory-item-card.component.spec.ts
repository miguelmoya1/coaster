import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItemCardComponent } from './inventory-item-card.component';

describe('InventoryItemCardComponent', () => {
  let component: InventoryItemCardComponent;
  let fixture: ComponentFixture<InventoryItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItemCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InventoryItemCardComponent);
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
