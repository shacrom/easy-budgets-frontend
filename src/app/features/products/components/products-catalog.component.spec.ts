import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsCatalogComponent } from './products-catalog.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

describe('ProductsCatalogComponent', () => {
  let component: ProductsCatalogComponent;
  let fixture: ComponentFixture<ProductsCatalogComponent>;
  let supabaseServiceSpy: jasmine.SpyObj<SupabaseService>;

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = jasmine.createSpyObj('SupabaseService', ['getProducts', 'createProduct', 'updateProduct', 'deleteProduct']);
    supabaseServiceSpy.getProducts.and.returnValue(Promise.resolve([]));

    await TestBed.configureTestingModule({
      imports: [ProductsCatalogComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsCatalogComponent);
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
