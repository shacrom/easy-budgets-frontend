import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { BudgetEditorComponent } from './budget-editor.component';
import { SupabaseService } from '../../../services/supabase.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('BudgetEditorComponent', () => {
  let component: BudgetEditorComponent;
  let fixture: ComponentFixture<BudgetEditorComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;
  let pdfExportServiceSpy: jasmine.SpyObj<PdfExportService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockBudget = {
    id: 1,
    title: 'Test Budget',
    status: 'draft',
    date: new Date(),
    expirationDate: new Date(),
    customerId: 10,
    customer: { id: 10, name: 'John Doe', address: '123 St' },
    textBlocks: [],
    materialTables: [],
    simpleBlock: null,
    additionalLines: [],
    companyLogoUrl: 'logo.png',
    supplierLogoUrl: 'supplier.png',
    showTextBlocks: true,
    showMaterials: true,
    showCountertop: false,
    showConditions: true,
    showSummary: true,
    showSignature: true,
    materialsSectionTitle: 'Materiales',
    conditionsTitle: 'Condiciones'
  };

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', [
      'getBudget',
      'updateBudget',
      'uploadPublicAsset',
      'searchCustomers',
      'getCustomer',
      'saveMaterialTables',
      'saveAdditionalLines',
      'updateBudgetTotals',
      'getProducts',
      'getTextBlocksForBudget',
      'getSimpleBlockForBudget',
      'getGeneralConditions'
    ]);
    pdfExportServiceSpy = jasmine.createSpyObj('PdfExportService', ['getBudgetPdfBlobUrlWithPageCount', 'generateBudgetPdf', 'openBudgetPdf']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Mock returns
    supabaseServiceSpy.getBudget.and.returnValue(Promise.resolve(mockBudget as any));
    supabaseServiceSpy.updateBudget.and.returnValue(Promise.resolve({ ...mockBudget } as any));
    supabaseServiceSpy.uploadPublicAsset.and.returnValue(Promise.resolve({ publicUrl: 'new-logo.png', path: 'path/to/logo.png' }));
    supabaseServiceSpy.getCustomer.and.returnValue(Promise.resolve({ id: 20, name: 'Jane Doe', address: '456 Ave' } as any));
    supabaseServiceSpy.searchCustomers.and.returnValue(Promise.resolve([{ id: 20, name: 'Jane Doe', address: '456 Ave' } as any]));
    supabaseServiceSpy.saveMaterialTables.and.returnValue(Promise.resolve({ tables: [], rows: [] } as any));
    supabaseServiceSpy.saveAdditionalLines.and.returnValue(Promise.resolve());
    supabaseServiceSpy.updateBudgetTotals.and.returnValue(Promise.resolve());
    supabaseServiceSpy.getProducts.and.returnValue(Promise.resolve([]));
    supabaseServiceSpy.getTextBlocksForBudget.and.returnValue(Promise.resolve([]));
    supabaseServiceSpy.getSimpleBlockForBudget.and.returnValue(Promise.resolve(null));
    supabaseServiceSpy.getGeneralConditions.and.returnValue(Promise.resolve([]));

    pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount.and.returnValue(Promise.resolve({ url: 'blob:url', pageCount: 1 }));
    pdfExportServiceSpy.generateBudgetPdf.and.returnValue(Promise.resolve());
    pdfExportServiceSpy.openBudgetPdf.and.returnValue(Promise.resolve());

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

  it('should search customers', fakeAsync(() => {
    component['onCustomerSearchChanged']('Jane');
    tick(400); // Wait for debounce

    expect(supabaseServiceSpy.searchCustomers).toHaveBeenCalledWith('Jane', 10);
    expect(component['customers']().length).toBe(1);
    expect(component['customers']()[0].name).toBe('Jane Doe');
  }));

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
    expect(component['isBudgetCompleted']()).toBeFalse();

    // Toggle to completed
    supabaseServiceSpy.updateBudget.and.returnValue(Promise.resolve({ ...mockBudget, status: 'completed' } as any));
    await component['toggleCompletionState']();

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { status: 'completed' });
    expect(component['isBudgetCompleted']()).toBeTrue();

    // Toggle back to not completed
    supabaseServiceSpy.updateBudget.and.returnValue(Promise.resolve({ ...mockBudget, status: 'not_completed' } as any));
    await component['toggleCompletionState']();

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { status: 'not_completed' });
    expect(component['isBudgetCompleted']()).toBeFalse();
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
    await component.toggleSection('textBlocks');
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { showTextBlocks: false });
    expect(component['showTextBlocks']()).toBeFalse();

    // Toggle materials
    await component.toggleSection('materials');
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { showMaterials: false });
    expect(component['showMaterials']()).toBeFalse();
  });

  it('should update materials section title', async () => {
    await fixture.whenStable();

    await component['onMaterialsSectionTitleChanged']('New Materials Title');

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, { materialsSectionTitle: 'New Materials Title' });
    expect(component['materialsSectionTitle']()).toBe('New Materials Title');
  });

  it('should handle PDF preview', fakeAsync(() => {
    component.togglePdfPreview();
    expect(component['showPdfPreview']()).toBeTrue();

    // Trigger effect
    fixture.detectChanges();
    tick(1000); // Wait for debounce

    expect(pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount).toHaveBeenCalled();
    flush();
  }));

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
      totalMaterials: 200,
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
      (component as any).materials.set([{ id: 1, name: 'Material 1' }]);
      (component as any).materialTables.set([{ id: 1, title: 'Table 1' }]);
      (component as any).simpleBlockData.set({ id: 1, model: 'Simple Block 1' });
      (component as any).budgetMeta.set({ id: 1, budgetNumber: 'B-001' });
      (component as any).cachedSelectedCustomer.set({ id: 1, name: 'Customer 1' });
    });

    it('should include all sections when they are visible', () => {
      (component as any).showTextBlocks.set(true);
      (component as any).showMaterials.set(true);
      (component as any).showSimpleBlock.set(true);

      const payload = (component as any).buildPdfPayload();

      expect(payload.blocks.length).toBe(1);
      expect(payload.materials.length).toBe(1);
      expect(payload.materialTables.length).toBe(1);
      expect(payload.simpleBlock).not.toBeNull();
    });

    it('should exclude hidden sections from payload', () => {
      (component as any).showTextBlocks.set(false);
      (component as any).showMaterials.set(false);
      (component as any).showSimpleBlock.set(false);

      const payload = (component as any).buildPdfPayload();

      expect(payload.blocks.length).toBe(0);
      expect(payload.materials.length).toBe(0);
      expect(payload.materialTables.length).toBe(0);
      expect(payload.simpleBlock).toBeNull();
    });

    it('should calculate totals correctly with all sections visible', () => {
      (component as any).showTextBlocks.set(true);
      (component as any).showMaterials.set(true);
      (component as any).showSimpleBlock.set(true);

      const payload = (component as any).buildPdfPayload();
      const summary = payload.summary;

      // Visible total: 100 + 200 + 300 = 600
      // Additional: -50 + 20 = -30 (Note is ignored)
      // Taxable Base: 600 - 30 = 570
      expect(summary.totalBlocks).toBe(100);
      expect(summary.totalMaterials).toBe(200);
      expect(summary.totalSimpleBlock).toBe(300);
      expect(summary.taxableBase).toBe(570);

      // VAT: 570 * 0.21 = 119.7
      expect(summary.vat).toBeCloseTo(119.7);

      // Grand Total: 570 + 119.7 = 689.7
      expect(summary.grandTotal).toBeCloseTo(689.7);
    });

    it('should calculate totals correctly with some sections hidden', () => {
      (component as any).showTextBlocks.set(true);   // 100
      (component as any).showMaterials.set(false);  // 0 (hidden)
      (component as any).showSimpleBlock.set(true);  // 300

      const payload = (component as any).buildPdfPayload();
      const summary = payload.summary;

      // Visible total: 100 + 0 + 300 = 400
      // Additional: -30
      // Taxable Base: 400 - 30 = 370
      expect(summary.totalBlocks).toBe(100);
      expect(summary.totalMaterials).toBe(0);
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
      (component as any).showTextBlocks.set(true);
      (component as any).showMaterials.set(false);
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
      expect((component as any).printTextBlocks()).toBeTrue();
      expect((component as any).printMaterials()).toBeTrue();
      expect((component as any).printSimpleBlock()).toBeTrue();
      expect((component as any).printConditions()).toBeTrue();
      expect((component as any).printSummary()).toBeTrue();
    });

    it('should toggle print options', () => {
      component.togglePrintOption('textBlocks');
      expect((component as any).printTextBlocks()).toBeFalse();

      component.togglePrintOption('materials');
      expect((component as any).printMaterials()).toBeFalse();

      component.togglePrintOption('textBlocks');
      expect((component as any).printTextBlocks()).toBeTrue();
    });

    it('should include print flags in PDF payload', () => {
      // Set some options to false
      component.togglePrintOption('materials');
      component.togglePrintOption('conditions');

      const payload = (component as any).buildPdfPayload();

      expect(payload.printTextBlocks).toBeTrue();
      expect(payload.printMaterials).toBeFalse();
      expect(payload.printSimpleBlock).toBeTrue();
      expect(payload.printConditions).toBeFalse();
      expect(payload.printSummary).toBeTrue();
    });
  });
});
