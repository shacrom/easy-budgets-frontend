import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetEditorComponent } from './budget-editor.component';
import { SupabaseService } from '../../../services/supabase.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BudgetSection, DEFAULT_SECTION_ORDER } from '../../../models/budget-section.model';

describe('BudgetEditorComponent', () => {
  let component: BudgetEditorComponent;
  let fixture: ComponentFixture<BudgetEditorComponent>;
  let supabaseServiceSpy: {
    getBudget: ReturnType<typeof vi.fn>;
    updateBudget: ReturnType<typeof vi.fn>;
    uploadPublicAsset: ReturnType<typeof vi.fn>;
    searchCustomers: ReturnType<typeof vi.fn>;
    getCustomer: ReturnType<typeof vi.fn>;
    saveItemTables: ReturnType<typeof vi.fn>;
    saveAdditionalLines: ReturnType<typeof vi.fn>;
    updateBudgetTotals: ReturnType<typeof vi.fn>;
    getProducts: ReturnType<typeof vi.fn>;
    getCompositeBlocksForBudget: ReturnType<typeof vi.fn>;
    getSimpleBlockForBudget: ReturnType<typeof vi.fn>;
    getGeneralConditions: ReturnType<typeof vi.fn>;
    getConditionTemplates: ReturnType<typeof vi.fn>;
  };
  let pdfExportServiceSpy: {
    getBudgetPdfBlobUrlWithPageCount: ReturnType<typeof vi.fn>;
    generateBudgetPdf: ReturnType<typeof vi.fn>;
    openBudgetPdf: ReturnType<typeof vi.fn>;
  };
  let routerSpy: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const mockBudget = {
    id: 1,
    title: 'Test Budget',
    status: 'draft',
    date: new Date(),
    expirationDate: new Date(),
    customerId: 10,
    customer: { id: 10, name: 'John Doe', address: '123 St' },
    compositeBlocks: [],
    itemTables: [],
    simpleBlock: null,
    additionalLines: [],
    companyLogoUrl: 'logo.png',
    supplierLogoUrl: 'supplier.png',
    showCompositeBlocks: true,
    showItemTables: true,
    showSimpleBlock: false,
    showConditions: true,
    showSummary: true,
    showSignature: true,
    sectionOrder: [...DEFAULT_SECTION_ORDER] as string[], // Cast to string[] for DB compatibility
    itemTablesSectionTitle: 'Elementos',
    conditionsTitle: 'Condiciones'
  };

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = {
      getBudget: vi.fn(),
      updateBudget: vi.fn(),
      uploadPublicAsset: vi.fn(),
      searchCustomers: vi.fn(),
      getCustomer: vi.fn(),
      saveItemTables: vi.fn(),
      saveAdditionalLines: vi.fn(),
      updateBudgetTotals: vi.fn(),
      getProducts: vi.fn(),
      getCompositeBlocksForBudget: vi.fn(),
      getSimpleBlockForBudget: vi.fn(),
      getGeneralConditions: vi.fn(),
      getConditionTemplates: vi.fn()
    };
    pdfExportServiceSpy = {
      getBudgetPdfBlobUrlWithPageCount: vi.fn(),
      generateBudgetPdf: vi.fn(),
      openBudgetPdf: vi.fn()
    };
    routerSpy = {
      navigate: vi.fn()
    };

    // Mock returns
    supabaseServiceSpy.getBudget.mockReturnValue(Promise.resolve(mockBudget as any));
    supabaseServiceSpy.updateBudget.mockReturnValue(Promise.resolve({ ...mockBudget } as any));
    supabaseServiceSpy.uploadPublicAsset.mockReturnValue(Promise.resolve({ publicUrl: 'new-logo.png', path: 'path/to/logo.png' }));
    supabaseServiceSpy.getCustomer.mockReturnValue(Promise.resolve({ id: 20, name: 'Jane Doe', address: '456 Ave' } as any));
    supabaseServiceSpy.searchCustomers.mockReturnValue(Promise.resolve([{ id: 20, name: 'Jane Doe', address: '456 Ave' } as any]));
    supabaseServiceSpy.saveItemTables.mockReturnValue(Promise.resolve({ tables: [], rows: [] } as any));
    supabaseServiceSpy.saveAdditionalLines.mockReturnValue(Promise.resolve());
    supabaseServiceSpy.updateBudgetTotals.mockReturnValue(Promise.resolve());
    supabaseServiceSpy.getProducts.mockReturnValue(Promise.resolve([]));
    supabaseServiceSpy.getCompositeBlocksForBudget.mockReturnValue(Promise.resolve([]));
    supabaseServiceSpy.getSimpleBlockForBudget.mockReturnValue(Promise.resolve(null));
    supabaseServiceSpy.getGeneralConditions.mockReturnValue(Promise.resolve([]));
    supabaseServiceSpy.getConditionTemplates.mockReturnValue(Promise.resolve([]));

    pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount.mockReturnValue(Promise.resolve({ url: 'blob:url', pageCount: 1 }));
    pdfExportServiceSpy.generateBudgetPdf.mockReturnValue(Promise.resolve());
    pdfExportServiceSpy.openBudgetPdf.mockReturnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [BudgetEditorComponent],
      providers: [
        provideAnimations(),
        { provide: SupabaseService, useValue: supabaseServiceSpy },
        { provide: PdfExportService, useValue: pdfExportServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: () => '1' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load budget on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getBudget).toHaveBeenCalledWith(1);
    expect(component['currentBudgetId']()).toBe(1);
    expect(component['budgetTitleInput']()).toBe('Test Budget');
    expect(component['selectedCustomer']()?.name).toBe('John Doe');
  });

  it('should update budget title', async () => {
    await fixture.whenStable();

    component['onBudgetTitleInput']('New Title');
    await component['onBudgetTitleBlur']();

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { title: 'New Title' });
  });

  it('should search customers', async () => {
    vi.useFakeTimers();
    component['onCustomerSearchChanged']('Jane');
    await vi.advanceTimersByTimeAsync(400); // Wait for debounce

    expect(supabaseServiceSpy.searchCustomers).toHaveBeenCalledWith('Jane', 10);
    expect(component['customers']().length).toBe(1);
    expect(component['customers']()[0].name).toBe('Jane Doe');
    vi.useRealTimers();
  });

  it('should update customer selection', async () => {
    await fixture.whenStable();

    await component['onCustomerSelected'](20);

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { customerId: 20 });
    expect(component['selectedCustomerId']()).toBe(20);
    expect(component['selectedCustomer']()?.name).toBe('Jane Doe');
  });

  it('should toggle budget completion status', async () => {
    await fixture.whenStable();

    // Initial state is draft (not completed)
    expect(component['isBudgetCompleted']()).toBe(false);

    // Toggle to completed
    supabaseServiceSpy.updateBudget.mockReturnValue(Promise.resolve({ ...mockBudget, status: 'approved' } as any));
    await component['toggleCompletionState']();

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { status: 'approved' });
    expect(component['isBudgetCompleted']()).toBe(true);

    // Toggle back to not completed
    supabaseServiceSpy.updateBudget.mockReturnValue(Promise.resolve({ ...mockBudget, status: 'not_completed' } as any));
    await component['toggleCompletionState']();

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { status: 'not_completed' });
    expect(component['isBudgetCompleted']()).toBe(false);
  });

  it('should upload company logo', async () => {
    await fixture.whenStable();

    const file = new File([''], 'logo.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as any;

    await component['onCompanyLogoFileSelected'](event);

    expect(supabaseServiceSpy.uploadPublicAsset).toHaveBeenCalled();
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { companyLogoUrl: 'new-logo.png' });
    expect(component['companyLogoUrl']()).toBe('new-logo.png');
  });

  it('should upload supplier logo', async () => {
    await fixture.whenStable();

    const file = new File([''], 'supplier.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as any;

    await component['onSupplierLogoFileSelected'](event);

    expect(supabaseServiceSpy.uploadPublicAsset).toHaveBeenCalled();
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { supplierLogoUrl: 'new-logo.png' });
    expect(component['supplierLogoUrl']()).toBe('new-logo.png');
  });

  it('should toggle sections visibility', async () => {
    await fixture.whenStable();

    // Toggle text blocks
    await component.toggleSection(BudgetSection.CompositeBlocks);
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { showCompositeBlocks: false });
    expect(component['showCompositeBlocks']()).toBe(false);

    // Toggle item tables (formerly materials)
    await component.toggleSection(BudgetSection.ItemTables);
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { showItemTables: false });
    expect(component['showItemTables']()).toBe(false);
  });

  it('should update items section title', async () => {
    await fixture.whenStable();

    await component['onItemTablesSectionTitleChanged']('New Items Title');

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { itemTablesSectionTitle: 'New Items Title' });
    expect(component['itemTablesSectionTitle']()).toBe('New Items Title');
  });

  it('should handle PDF preview', async () => {
    vi.useFakeTimers();
    component.togglePdfPreview();
    expect(component['showPdfPreview']()).toBe(true);

    // Trigger effect
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1000); // Wait for debounce

    expect(pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should export PDF', async () => {
    await fixture.whenStable();

    await component['exportBudgetPdf']();
    expect(pdfExportServiceSpy.generateBudgetPdf).toHaveBeenCalled();
  });

  it('should preview PDF in new tab', async () => {
    await fixture.whenStable();

    await component['previewBudgetPdf']();
    expect(pdfExportServiceSpy.openBudgetPdf).toHaveBeenCalled();
  });

  describe('buildPdfPayload', () => {
    const mockSummary = {
      totalBlocks: 100,
      totalItems: 200,
      totalSimpleBlock: 300,
      taxableBase: 600,
      vatPercentage: 21,
      vat: 126,
      grandTotal: 726,
      additionalLines: [
        { id: 1, concept: 'Discount', amount: -50, conceptType: 'discount' },
        { id: 2, concept: 'Extra', amount: 20, conceptType: 'adjustment' },
        { id: 3, concept: 'Note', amount: 0, conceptType: 'note' }
      ]
    };

    beforeEach(() => {
      // Setup initial state
      (component as any).summarySnapshot.set(mockSummary);
      (component as any).blocks.set([{ id: 1, text: 'Block 1' }]);
      (component as any).items.set([{ id: 1, name: 'Item 1' }]);
      (component as any).itemTables.set([{ id: 1, title: 'Table 1' }]);
      (component as any).simpleBlockData.set({ id: 1, model: 'Simple Block 1' });
      (component as any).budgetMeta.set({ id: 1, budgetNumber: 'B-001' });
      (component as any).cachedSelectedCustomer.set({ id: 1, name: 'Customer 1' });
    });

    it('should include all sections when they are visible', () => {
      (component as any).showCompositeBlocks.set(true);
      (component as any).showItemTables.set(true);
      (component as any).showSimpleBlock.set(true);

      const payload = (component as any).buildPdfPayload();

      expect(payload.blocks.length).toBe(1);
      expect(payload.items.length).toBe(1);
      expect(payload.itemTables.length).toBe(1);
      expect(payload.simpleBlock).not.toBeNull();
    });

    it('should exclude hidden sections from payload', () => {
      (component as any).showCompositeBlocks.set(false);
      (component as any).showItemTables.set(false);
      (component as any).showSimpleBlock.set(false);

      const payload = (component as any).buildPdfPayload();

      expect(payload.blocks.length).toBe(0);
      expect(payload.items.length).toBe(0);
      expect(payload.itemTables.length).toBe(0);
      expect(payload.simpleBlock).toBeNull();
    });

    it('should calculate totals correctly with all sections visible', () => {
      (component as any).showCompositeBlocks.set(true);
      (component as any).showItemTables.set(true);
      (component as any).showSimpleBlock.set(true);

      const payload = (component as any).buildPdfPayload();
      const summary = payload.summary;

      // Visible total: 100 + 200 + 300 = 600
      // Additional: -50 + 20 = -30 (Note is ignored)
      // Taxable Base: 600 - 30 = 570
      expect(summary.totalBlocks).toBe(100);
      expect(summary.totalItems).toBe(200);
      expect(summary.totalSimpleBlock).toBe(300);
      expect(summary.taxableBase).toBe(570);

      // VAT: 570 * 0.21 = 119.7
      expect(summary.vat).toBeCloseTo(119.7);

      // Grand Total: 570 + 119.7 = 689.7
      expect(summary.grandTotal).toBeCloseTo(689.7);
    });

    it('should calculate totals correctly with some sections hidden', () => {
      (component as any).showCompositeBlocks.set(true);   // 100
      (component as any).showItemTables.set(false);  // 0 (hidden)
      (component as any).showSimpleBlock.set(true);  // 300

      const payload = (component as any).buildPdfPayload();
      const summary = payload.summary;

      // Visible total: 100 + 0 + 300 = 400
      // Additional: -30
      // Taxable Base: 400 - 30 = 370
      expect(summary.totalBlocks).toBe(100);
      expect(summary.totalItems).toBe(0);
      expect(summary.totalSimpleBlock).toBe(300);
      expect(summary.taxableBase).toBe(370);

      // VAT: 370 * 0.21 = 77.7
      expect(summary.vat).toBeCloseTo(77.7);

      // Grand Total: 370 + 77.7 = 447.7
      expect(summary.grandTotal).toBeCloseTo(447.7);
    });

    it('should handle null summary snapshot', () => {
      (component as any).summarySnapshot.set(null);

      // Should not throw
      const payload = (component as any).buildPdfPayload();
      expect(payload).toBeDefined();
    });

    it('should ignore "note" type additional lines in calculation', () => {
      (component as any).showCompositeBlocks.set(true);
      (component as any).showItemTables.set(false);
      (component as any).showSimpleBlock.set(false);

      // Only blocks visible: 100
      // Additional lines: -50 (discount), 20 (adjustment), 0 (note)
      // Note should not affect calculation even if it had an amount (though usually 0)

      const payload = (component as any).buildPdfPayload();
      const summary = payload.summary;

      // 100 - 50 + 20 = 70
      expect(summary.taxableBase).toBe(70);
    });
  });

  describe('PDF Print Options', () => {
    it('should initialize print options to true by default', () => {
      expect((component as any).printCompositeBlocks()).toBe(true);
      expect((component as any).printItemTables()).toBe(true);
      expect((component as any).printSimpleBlock()).toBe(true);
      expect((component as any).printConditions()).toBe(true);
      expect((component as any).printSummary()).toBe(true);
    });

    it('should toggle print options', () => {
      component.togglePrintOption(BudgetSection.CompositeBlocks);
      expect((component as any).printCompositeBlocks()).toBe(false);

      component.togglePrintOption(BudgetSection.ItemTables);
      expect((component as any).printItemTables()).toBe(false);

      component.togglePrintOption(BudgetSection.CompositeBlocks);
      expect((component as any).printCompositeBlocks()).toBe(true);
    });

    it('should include print flags in PDF payload', () => {
      // Set some options to false
      component.togglePrintOption(BudgetSection.ItemTables);
      component.togglePrintOption(BudgetSection.Conditions);

      const payload = (component as any).buildPdfPayload();

      expect(payload.printCompositeBlocks).toBe(true);
      expect(payload.printItemTables).toBe(false);
      expect(payload.printSimpleBlock).toBe(true);
      expect(payload.printConditions).toBe(false);
      expect(payload.printSummary).toBe(true);
    });
  });

  describe('Section Reordering', () => {
    it('should initialize with default section order', () => {
      expect(component['sectionOrder']()).toEqual(DEFAULT_SECTION_ORDER);
    });

    it('should load section order from budget and migrate legacy keys', async () => {
      const legacyOrder = ['summary', 'textBlocks', 'materials', 'simpleBlock', 'conditions', 'signature'];
      const expectedOrder: BudgetSection[] = [BudgetSection.Summary, BudgetSection.CompositeBlocks, BudgetSection.ItemTables, BudgetSection.SimpleBlock, BudgetSection.Conditions, BudgetSection.Signature];
      const budgetWithOrder = { ...mockBudget, sectionOrder: legacyOrder };
      supabaseServiceSpy.getBudget.mockReturnValue(Promise.resolve(budgetWithOrder as any));

      // Re-initialize component to trigger loadBudget
      await component['loadBudget'](1);

      expect(component['sectionOrder']()).toEqual(expectedOrder);
    });

    it('should update section order on drop', () => {
      const initialOrder: BudgetSection[] = [BudgetSection.CompositeBlocks, BudgetSection.ItemTables, BudgetSection.SimpleBlock, BudgetSection.Conditions, BudgetSection.Summary, BudgetSection.Signature];
      component['sectionOrder'].set(initialOrder);

      // Simulate moving 'compositeBlocks' (index 0) to index 1
      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      component.drop(event);

      const expectedOrder: BudgetSection[] = [BudgetSection.ItemTables, BudgetSection.CompositeBlocks, BudgetSection.SimpleBlock, BudgetSection.Conditions, BudgetSection.Summary, BudgetSection.Signature];
      expect(component['sectionOrder']()).toEqual(expectedOrder);
      expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { sectionOrder: expectedOrder });
    });

    it('should include section order in PDF payload', () => {
      const customOrder: BudgetSection[] = [BudgetSection.Summary, BudgetSection.CompositeBlocks, BudgetSection.ItemTables, BudgetSection.SimpleBlock, BudgetSection.Conditions, BudgetSection.Signature];
      component['sectionOrder'].set(customOrder);

      const payload = (component as any).buildPdfPayload();

      expect(payload.sectionOrder).toEqual(customOrder);
    });
  });
});
