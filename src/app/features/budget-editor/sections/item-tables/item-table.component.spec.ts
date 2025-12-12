import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemTableComponent } from './item-table.component';
import { SupabaseService } from '../../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ItemTable } from '../../../../models/item-table.model';
import { Product } from '../../../../models/product.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ItemTableComponent', () => {
  let component: ItemTableComponent;
  let fixture: ComponentFixture<ItemTableComponent>;
  let supabaseServiceSpy: { getProducts: ReturnType<typeof vi.fn> };

  const mockProducts: Product[] = [
    { id: 1, reference: 'P1', description: 'Prod 1', supplierId: 1, basePrice: 10, category: 'C1', vatRate: 21, active: true }
  ];

  const mockTables: ItemTable[] = [
    {
      id: 1,
      title: 'Table 1',
      orderIndex: 0,
      rows: [
        { id: 101, tableId: 1, orderIndex: 0, reference: 'R1', description: 'D1', supplierId: 1, quantity: 1, unitPrice: 10, totalPrice: 10 }
      ],
      showReference: true,
      showDescription: true,
      showSupplier: true,
      showQuantity: true,
      showUnitPrice: true,
      showTotalPrice: true
    }
  ];

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = { getProducts: vi.fn() };
    supabaseServiceSpy.getProducts.mockReturnValue(Promise.resolve(mockProducts as any));

    await TestBed.configureTestingModule({
      imports: [ItemTableComponent, NoopAnimationsModule],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getProducts).toHaveBeenCalled();
    expect(component['products']().length).toBe(1);
  });

  it('should sync tables from input', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    expect(component['tables']().length).toBe(1);
    expect(component['tables']()[0].title).toBe('Table 1');
    expect(component['tables']()[0].rows.length).toBe(1);
  });

  it('should update section title', () => {
    const event = { target: { value: 'New Section Title' } } as any;
    component['updateSectionTitle'](event);

    expect(component['sectionTitle']()).toBe('New Section Title');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should add a new table', () => {
    component['addTable']();
    expect(component['tables']().length).toBe(1); // Initially 0 + 1
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should delete a table', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    component['deleteTable'](1);
    expect(component['tables']().length).toBe(0);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should update table title', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    const event = { target: { value: 'Updated Table Title' } } as any;
    component['updateTableTitle'](1, event);

    expect(component['tables']()[0].title).toBe('Updated Table Title');
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should add new item to table', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    component['addNewRow'](1);
    expect(component['tables']()[0].rows.length).toBe(2);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should delete item from table', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    component['deleteRow'](1, 101);
    expect(component['tables']()[0].rows.length).toBe(0);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should toggle column visibility', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    component['toggleShowColumn'](1, 'showReference');
    expect(component['tables']()[0].showReference).toBe(false);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });

  it('should calculate total items', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    expect(component['totalItems']()).toBe(10);
  });

  it('should save changes and emit events', async () => {
    vi.useFakeTimers();
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0); // Allow view children to settle

    let emittedTotal: number | undefined;
    component.totalChanged.subscribe((val: number) => emittedTotal = val);

    let emittedTables: ItemTable[] | undefined;
    component.tablesChanged.subscribe((val: ItemTable[]) => emittedTables = val);

    component['saveChanges']();

    expect(component['isSaving']()).toBe(true);
    expect(component['hasUnsavedChanges']()).toBe(false);
    expect(emittedTotal).toBe(10);
    expect(emittedTables).toBeDefined();
    expect(emittedTables![0].rows[0].reference).toBe('R1');

    await vi.advanceTimersByTimeAsync(300);
    expect(component['isSaving']()).toBe(false);
    vi.useRealTimers();
  });

  it('should discard changes', () => {
    fixture.componentRef.setInput('tables', mockTables);
    fixture.detectChanges();

    // Make a change
    component['addTable']();
    expect(component['tables']().length).toBe(2);
    expect(component['hasUnsavedChanges']()).toBe(true);

    // Discard
    component['discardChanges']();
    expect(component['tables']().length).toBe(1);
    expect(component['hasUnsavedChanges']()).toBe(false);
  });

  it('should handle drag and drop reordering', () => {
    const multiRowTable = {
      ...mockTables[0],
      rows: [
        { ...mockTables[0].rows[0], id: 101 },
        { ...mockTables[0].rows[0], id: 102 }
      ]
    };
    fixture.componentRef.setInput('tables', [multiRowTable]);
    fixture.detectChanges();

    const event = {
      previousIndex: 0,
      currentIndex: 1,
      container: { data: multiRowTable.rows }
    } as any;

    component['drop'](event, 1);

    expect(component['tables']()[0].rows[0].id).toBe(102);
    expect(component['tables']()[0].rows[1].id).toBe(101);
    expect(component['hasUnsavedChanges']()).toBe(true);
  });
});
