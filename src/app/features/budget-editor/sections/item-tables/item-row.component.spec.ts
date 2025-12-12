import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemRowComponent } from './item-row.component';
import { ItemRow } from '../../../../models/item-table.model';
import { Product } from '../../../../models/product.model';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

describe('ItemRowComponent', () => {
  let component: ItemRowComponent;
  let fixture: ComponentFixture<ItemRowComponent>;

  const mockItem: ItemRow = {
    id: 1,
    reference: 'REF1',
    description: 'Desc',
    supplierId: 1,
    quantity: 2,
    unitPrice: 10,
    totalPrice: 20,
    orderIndex: 0
  };

  const mockProducts: Product[] = [
    { id: 1, reference: 'PROD1', description: 'Product 1', supplierId: 1, basePrice: 50, category: 'C1', vatRate: 21, active: true },
    { id: 2, reference: 'PROD2', description: 'Product 2', supplierId: 2, basePrice: 100, category: 'C2', vatRate: 21, active: true }
  ];

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('row', mockItem);
    fixture.componentRef.setInput('products', mockProducts);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize local signals from input', () => {
    expect(component['localReference']()).toBe('REF1');
    expect(component['localDescription']()).toBe('Desc');
    expect(component['localSupplierId']()).toBe(1);
    expect(component['localQuantity']()).toBe(2);
    expect(component['localUnitPrice']()).toBe(10);
    expect(component['totalPrice']()).toBe(20);
  });

  it('should update local reference and emit change', () => {
    let emitted = false;
    component.localValuesChanged.subscribe(() => emitted = true);

    component['onReferenceChange']('NEWREF');

    expect(component['localReference']()).toBe('NEWREF');
    expect(component['referenceSearchTerm']()).toBe('NEWREF');
    expect(component['referenceDropdownOpen']()).toBe(true);
    expect(emitted).toBe(true);
  });

  it('should update local supplierId and emit change', () => {
    let emitted = false;
    component.localValuesChanged.subscribe(() => emitted = true);

    component['onSupplierIdChange'](2);

    expect(component['localSupplierId']()).toBe(2);
    expect(emitted).toBe(true);
  });

  it('should update local quantity and emit change', () => {
    let emitted = false;
    component.localValuesChanged.subscribe(() => emitted = true);

    component['onQuantityChange'](5);

    expect(component['localQuantity']()).toBe(5);
    expect(component['totalPrice']()).toBe(50); // 5 * 10
    expect(emitted).toBe(true);
  });

  it('should update local unit price and emit change', () => {
    let emitted = false;
    component.localValuesChanged.subscribe(() => emitted = true);

    component['onUnitPriceChange'](20);

    expect(component['localUnitPrice']()).toBe(20);
    expect(component['totalPrice']()).toBe(40); // 2 * 20
    expect(emitted).toBe(true);
  });

  it('should update local description and emit change', () => {
    let emitted = false;
    component.localValuesChanged.subscribe(() => emitted = true);

    component['onDescriptionChange']('New Desc');

    expect(component['localDescription']()).toBe('New Desc');
    expect(emitted).toBe(true);
  });

  it('should filter reference matches', () => {
    component['referenceSearchTerm'].set('PROD1');
    fixture.detectChanges();
    expect(component['referenceMatches']().length).toBe(1);
    expect(component['referenceMatches']()[0].reference).toBe('PROD1');

    component['referenceSearchTerm'].set('Product');
    fixture.detectChanges();
    expect(component['referenceMatches']().length).toBe(2);
  });

  it('should apply product from suggestion', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'preventDefault');

    let emitted = false;
    component.localValuesChanged.subscribe(() => emitted = true);

    component['applyProductFromSuggestion'](event, mockProducts[0]);

    expect(component['localReference']()).toBe('PROD1');
    expect(component['localDescription']()).toBe('Product 1');
    expect(component['localSupplierId']()).toBe(1);
    expect(component['localUnitPrice']()).toBe(50);
    expect(component['referenceDropdownOpen']()).toBe(false);
    expect(emitted).toBe(true);
  });

  it('should close dropdown with delay', async () => {
    vi.useFakeTimers();
    component['openReferenceDropdown']();
    expect(component['referenceDropdownOpen']()).toBe(true);

    component['closeReferenceDropdown']();
    expect(component['referenceDropdownOpen']()).toBe(true); // Still open immediately

    await vi.advanceTimersByTimeAsync(120);
    expect(component['referenceDropdownOpen']()).toBe(false);
    vi.useRealTimers();
  });

  it('should emit deleteRequested', () => {
    let emittedId: number | undefined;
    component.deleteRequested.subscribe((id: number) => emittedId = id);

    component['requestDelete']();

    expect(emittedId).toBe(1);
  });

  it('should return current item with local values', () => {
    component['onQuantityChange'](10);
    component['onUnitPriceChange'](5);

    const current = component.getCurrentRow();

    expect(current.quantity).toBe(10);
    expect(current.unitPrice).toBe(5);
    expect(current.totalPrice).toBe(50);
    expect(current.id).toBe(1);
  });
});
