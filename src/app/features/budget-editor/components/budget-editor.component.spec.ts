import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BudgetEditorComponent } from './budget-editor.component';
import { SupabaseService } from '../../../services/supabase.service';
import { PdfExportService } from '../../../services/pdf-export.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

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
    countertop: null,
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
      'getCustomer'
    ]);
    pdfExportServiceSpy = jasmine.createSpyObj('PdfExportService', ['getBudgetPdfBlobUrlWithPageCount']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Mock returns
    supabaseServiceSpy.getBudget.and.returnValue(Promise.resolve(mockBudget as any));
    supabaseServiceSpy.updateBudget.and.returnValue(Promise.resolve({ ...mockBudget } as any));
    supabaseServiceSpy.uploadPublicAsset.and.returnValue(Promise.resolve({ publicUrl: 'new-logo.png', path: 'path/to/logo.png' }));
    supabaseServiceSpy.getCustomer.and.returnValue(Promise.resolve({ id: 20, name: 'Jane Doe', address: '456 Ave' } as any));

    pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount.and.returnValue(Promise.resolve({ url: 'blob:url', pageCount: 1 }));

    await TestBed.configureTestingModule({
      imports: [BudgetEditorComponent],
      providers: [
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

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, jasmine.objectContaining({ title: 'New Title' }));
  });

  it('should toggle budget status', async () => {
    await fixture.whenStable();

    await component['toggleCompletionState']();

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, jasmine.objectContaining({ status: 'completed' }));
  });

  it('should update PDF preview with debounce', fakeAsync(() => {
    component['showPdfPreview'].set(true);
    component['isInitialized'].set(true);

    // Trigger update
    component.updatePdfPreview();

    expect(pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount).not.toHaveBeenCalled();

    tick(800); // Wait for debounce

    expect(pdfExportServiceSpy.getBudgetPdfBlobUrlWithPageCount).toHaveBeenCalled();
  }));

  it('should upload company logo', async () => {
    await fixture.whenStable();

    const file = new File([''], 'logo.png', { type: 'image/png' });
    const event = { target: { files: [file] } } as any;

    await component['onCompanyLogoFileSelected'](event);

    expect(supabaseServiceSpy.uploadPublicAsset).toHaveBeenCalled();
    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, jasmine.objectContaining({ companyLogoUrl: 'new-logo.png' }));
  });

  it('should handle customer selection', async () => {
    await fixture.whenStable();

    const newCustomer = { id: 20, name: 'Jane Doe', address: '456 Ave' };
    await component['onCustomerSelected'](20);

    expect(supabaseServiceSpy.updateBudget).toHaveBeenCalledWith(1, jasmine.objectContaining({ customerId: 20 }));
    expect(component['selectedCustomer']()?.id).toBe(20);
  });
});
