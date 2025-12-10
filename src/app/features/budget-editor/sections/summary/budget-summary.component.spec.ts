import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetSummaryComponent } from './budget-summary.component';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { SummaryLine } from '../../../../models/budget-summary.model';

describe('BudgetSummaryComponent', () => {
  let component: BudgetSummaryComponent;
  let fixture: ComponentFixture<BudgetSummaryComponent>;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetSummaryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Calculations', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.componentRef.setInput('totalItems', 50);
      fixture.componentRef.setInput('totalSimpleBlock', 50);
      fixture.detectChanges();
    });

    it('should calculate base subtotal correctly', () => {
      // 100 + 50 + 50 = 200
      expect(component['baseSubtotal']()).toBe(200);
    });

    it('should calculate taxable base correctly without adjustments', () => {
      expect(component['taxableBase']()).toBe(200);
    });

    it('should calculate VAT correctly (default 21%)', () => {
      // 200 * 0.21 = 42
      expect(component['vat']()).toBe(42);
    });

    it('should calculate grand total correctly', () => {
      // 200 + 42 = 242
      expect(component['grandTotal']()).toBe(242);
    });

    it('should respect visibility flags', () => {
      fixture.componentRef.setInput('showBlocks', false);
      fixture.detectChanges();
      // 0 + 50 + 50 = 100
      expect(component['baseSubtotal']()).toBe(100);
    });
  });

  describe('Additional Lines', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.detectChanges();
    });

    it('should add a new line', () => {
      component['addAdditionalLine']();
      expect(component['additionalLines']().length).toBe(1);
      expect(component['hasUnsavedChanges']()).toBe(true);
    });

    it('should update an existing line', () => {
      component['addAdditionalLine']();
      const line = component['additionalLines']()[0];
      const updatedLine: SummaryLine = { ...line, concept: 'Updated', amount: 10 };

      component['updateAdditionalLine'](updatedLine);

      const lines = component['additionalLines']();
      expect(lines[0].concept).toBe('Updated');
      expect(lines[0].amount).toBe(10);
    });

    it('should delete a line', () => {
      component['addAdditionalLine']();
      const lineId = component['additionalLines']()[0].id;

      component['deleteAdditionalLine'](lineId);

      expect(component['additionalLines']().length).toBe(0);
    });

    it('should calculate adjustments correctly (addition)', () => {
      // Base 100
      component['addAdditionalLine']();
      const line = component['additionalLines']()[0];
      component['updateAdditionalLine']({ ...line, conceptType: 'adjustment', amount: 20 });

      // 100 + 20 = 120
      expect(component['netAdjustments']()).toBe(20);
      expect(component['taxableBase']()).toBe(120);
    });

    it('should calculate discounts correctly (percentage applied after VAT)', () => {
      // Base 100, VAT 21% by default
      component['addAdditionalLine']();
      const line = component['additionalLines']()[0];
      // 10% discount
      component['updateAdditionalLine']({ ...line, conceptType: 'discount', amount: 10 });

      // Discounts are NOT included in netAdjustments (only applied after VAT)
      expect(component['netAdjustments']()).toBe(0);
      // taxableBase = 100 (discounts don't affect it)
      expect(component['taxableBase']()).toBe(100);
      // totalBeforeDiscount = 100 + 21 (21% VAT) = 121
      expect(component['totalBeforeDiscount']()).toBe(121);
      // totalDiscount = 121 * 0.10 = 12.1
      expect(component['totalDiscount']()).toBeCloseTo(12.1, 2);
      // grandTotal = 121 - 12.1 = 108.9
      expect(component['grandTotal']()).toBeCloseTo(108.9, 2);
    });
  });

  describe('VAT Handling', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.detectChanges();
    });

    it('should update VAT percentage', () => {
      component['updateVatPercentage'](10);
      expect(component['vatPercentage']()).toBe(10);
      // 100 * 0.10 = 10
      expect(component['vat']()).toBe(10);
    });

    it('should handle string input for VAT', () => {
      component['updateVatPercentage']('10');
      expect(component['vatPercentage']()).toBe(10);
    });
  });

  describe('Save and Discard', () => {
    it('should emit changes on save', () => {
      vi.spyOn(component.summaryChanged, 'emit');
      vi.spyOn(component.vatPercentageChanged, 'emit');
      vi.spyOn(component.additionalLinesChanged, 'emit');

      component['saveChanges']();

      expect(component.summaryChanged.emit).toHaveBeenCalled();
      expect(component.vatPercentageChanged.emit).toHaveBeenCalled();
      expect(component.additionalLinesChanged.emit).toHaveBeenCalled();
      expect(component['isSaving']()).toBe(false);
      expect(component['hasUnsavedChanges']()).toBe(false);
    });

    it('should revert changes on discard', () => {
      const initialVat = component['vatPercentage']();
      component['updateVatPercentage'](50);
      expect(component['vatPercentage']()).toBe(50);

      component['discardChanges']();

      expect(component['vatPercentage']()).toBe(initialVat);
      expect(component['hasUnsavedChanges']()).toBe(false);
    });
  });

  describe('Section Ordering', () => {
    it('should render sections in default order (simpleBlock, compositeBlocks, itemTables)', () => {
      // Setup data for all sections
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.componentRef.setInput('totalItems', 50);
      fixture.componentRef.setInput('totalSimpleBlock', 25);
      fixture.componentRef.setInput('showBlocks', true);
      fixture.componentRef.setInput('showItemTables', true);
      fixture.componentRef.setInput('showSimpleBlock', true);
      fixture.componentRef.setInput('blocks', [{ id: 1, heading: 'Block 1', subtotal: 100, sectionTitle: 'Bloques' }]);
      fixture.componentRef.setInput('items', [{ id: 1, description: 'Item 1', totalPrice: 50 }]);
      fixture.detectChanges();

      const orderedSections = component['orderedSections']();

      expect(orderedSections.length).toBe(3);
      expect(orderedSections[0].key).toBe('simpleBlock');
      expect(orderedSections[1].key).toBe('compositeBlocks');
      expect(orderedSections[2].key).toBe('itemTables');
    });

    it('should render sections in custom order', () => {
      // Setup custom order: itemTables, simpleBlock, compositeBlocks
      fixture.componentRef.setInput('sectionOrder', ['itemTables', 'simpleBlock', 'compositeBlocks']);
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.componentRef.setInput('totalItems', 50);
      fixture.componentRef.setInput('totalSimpleBlock', 25);
      fixture.componentRef.setInput('showBlocks', true);
      fixture.componentRef.setInput('showItemTables', true);
      fixture.componentRef.setInput('showSimpleBlock', true);
      fixture.componentRef.setInput('blocks', [{ id: 1, heading: 'Block 1', subtotal: 100 }]);
      fixture.componentRef.setInput('items', [{ id: 1, description: 'Item 1', totalPrice: 50 }]);
      fixture.detectChanges();

      const orderedSections = component['orderedSections']();

      expect(orderedSections.length).toBe(3);
      expect(orderedSections[0].key).toBe('itemTables');
      expect(orderedSections[1].key).toBe('simpleBlock');
      expect(orderedSections[2].key).toBe('compositeBlocks');
    });

    it('should only include visible sections in ordered list', () => {
      fixture.componentRef.setInput('sectionOrder', ['compositeBlocks', 'itemTables', 'simpleBlock']);
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.componentRef.setInput('totalItems', 50);
      fixture.componentRef.setInput('totalSimpleBlock', 25);
      fixture.componentRef.setInput('showBlocks', true);
      fixture.componentRef.setInput('showItemTables', false); // Hidden
      fixture.componentRef.setInput('showSimpleBlock', true);
      fixture.componentRef.setInput('blocks', [{ id: 1, heading: 'Block 1', subtotal: 100 }]);
      fixture.detectChanges();

      const orderedSections = component['orderedSections']();

      // Only 2 sections should be visible (itemTables is hidden)
      expect(orderedSections.length).toBe(2);
      expect(orderedSections[0].key).toBe('compositeBlocks');
      expect(orderedSections[1].key).toBe('simpleBlock');
      expect(orderedSections.find(s => s.key === 'itemTables')).toBeUndefined();
    });

    it('should handle empty section order gracefully', () => {
      fixture.componentRef.setInput('sectionOrder', []);
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.componentRef.setInput('showBlocks', true);
      fixture.componentRef.setInput('blocks', [{ id: 1, heading: 'Block 1', subtotal: 100 }]);
      fixture.detectChanges();

      const orderedSections = component['orderedSections']();

      // No sections should be rendered with empty order
      expect(orderedSections.length).toBe(0);
    });

    it('should handle unknown section keys in order', () => {
      fixture.componentRef.setInput('sectionOrder', ['unknownSection', 'compositeBlocks', 'itemTables']);
      fixture.componentRef.setInput('totalBlocks', 100);
      fixture.componentRef.setInput('totalItems', 50);
      fixture.componentRef.setInput('showBlocks', true);
      fixture.componentRef.setInput('showItemTables', true);
      fixture.componentRef.setInput('blocks', [{ id: 1, heading: 'Block 1', subtotal: 100 }]);
      fixture.componentRef.setInput('items', [{ id: 1, description: 'Item 1', totalPrice: 50 }]);
      fixture.detectChanges();

      const orderedSections = component['orderedSections']();

      // Only valid sections should be included
      expect(orderedSections.length).toBe(2);
      expect(orderedSections[0].key).toBe('compositeBlocks');
      expect(orderedSections[1].key).toBe('itemTables');
    });
  });
});
