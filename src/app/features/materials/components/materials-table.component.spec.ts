import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialsTableComponent } from './materials-table.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

describe('MaterialsTableComponent', () => {
  let component: MaterialsTableComponent;
  let fixture: ComponentFixture<MaterialsTableComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getProducts', 'saveMaterials']);
    supabaseServiceSpy.getProducts.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [MaterialsTableComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MaterialsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceSpy.getProducts).toHaveBeenCalled();
  });
});
