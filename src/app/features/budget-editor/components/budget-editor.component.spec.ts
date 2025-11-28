import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getBudget', 'updateBudget']);
    pdfExportServiceSpy = jasmine.createSpyObj('PdfExportService', ['getBudgetPdfBlobUrlWithPageCount']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Mock returns
    supabaseServiceSpy.getBudget.and.returnValue(Promise.resolve({
      id: 1,
      title: 'Test Budget',
      textBlocks: [],
      materialTables: [],
      countertop: null,
      additionalLines: [],
      customer: null
    } as any));

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
});
