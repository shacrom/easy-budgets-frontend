import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetSummaryComponent } from './budget-summary.component';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { SummaryLine } from '../../../models/budget-summary.model';

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
      fixture.componentRef.setInput('totalMaterials', 50);
      fixture.componentRef.setInput('totalCountertop', 50);
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
      expect(component['hasUnsavedChanges']()).toBeTrue();
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

    it('should calculate discounts correctly (percentage)', () => {
      // Base 100
      component['addAdditionalLine']();
      const line = component['additionalLines']()[0];
      // 10% discount
      component['updateAdditionalLine']({ ...line, conceptType: 'discount', amount: 10 });
      
      // 100 * 0.10 = 10 discount
      // Net adjustments = -10
      expect(component['netAdjustments']()).toBe(-10);
      expect(component['taxableBase']()).toBe(90);
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
      spyOn(component.summaryChanged, 'emit');
      spyOn(component.vatPercentageChanged, 'emit');
      spyOn(component.additionalLinesChanged, 'emit');

      component['saveChanges']();

      expect(component.summaryChanged.emit).toHaveBeenCalled();
      expect(component.vatPercentageChanged.emit).toHaveBeenCalled();
      expect(component.additionalLinesChanged.emit).toHaveBeenCalled();
      expect(component['isSaving']()).toBeFalse();
      expect(component['hasUnsavedChanges']()).toBeFalse();
    });

    it('should revert changes on discard', () => {
      const initialVat = component['vatPercentage']();
      component['updateVatPercentage'](50);
      expect(component['vatPercentage']()).toBe(50);

      component['discardChanges']();
      
      expect(component['vatPercentage']()).toBe(initialVat);
      expect(component['hasUnsavedChanges']()).toBeFalse();
    });
  });
});
