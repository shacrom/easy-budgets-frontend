import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsCatalogComponent } from './products-catalog.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Product } from '../../../models/product.model';

describe('ProductsCatalogComponent', () => {
  let component: ProductsCatalogComponent;
  let fixture: ComponentFixture<ProductsCatalogComponent>;
  let supabaseServiceSpy: {
    getProducts: ReturnType<typeof vi.fn>;
    createProduct: ReturnType<typeof vi.fn>;
    updateProduct: ReturnType<typeof vi.fn>;
    deleteProduct: ReturnType<typeof vi.fn>;
  };

  const mockProducts: Product[] = [
    { id: 1, reference: 'P1', description: 'Product 1', manufacturer: 'M1', basePrice: 100, vatRate: 21, category: 'C1', active: true },
    { id: 2, reference: 'P2', description: 'Product 2', manufacturer: 'M2', basePrice: 200, vatRate: 10, category: 'C2', active: true },
    { id: 3, reference: 'P3', description: 'Product 3', manufacturer: 'M1', basePrice: 300, vatRate: 21, category: 'C1', active: false }
  ];

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  beforeEach(async () => {
    supabaseServiceSpy = {
      getProducts: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn()
    };

    supabaseServiceSpy.getProducts.mockReturnValue(Promise.resolve(mockProducts as any));

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
    expect(component['products']().length).toBe(3);
    expect(component['isLoading']()).toBe(false);
  });

  it('should handle error loading products', async () => {
    supabaseServiceSpy.getProducts.mockReturnValue(Promise.reject('Error'));
    component['loadProducts']();
    await fixture.whenStable();

    expect(component['errorMessage']()).toBe('Error al cargar los productos');
    expect(component['isLoading']()).toBe(false);
  });

  describe('Filtering and Pagination', () => {
    it('should filter products by search term', () => {
      component['searchTerm'].set('Product 1');
      fixture.detectChanges();
      expect(component['filteredProducts']().length).toBe(1);
      expect(component['filteredProducts']()[0].reference).toBe('P1');
    });

    it('should reset page when searching', () => {
      component['currentPage'].set(1);
      const event = { target: { value: 'Product' } } as any;
      component['updateSearch'](event);
      expect(component['currentPage']()).toBe(0);
    });

    it('should paginate products', () => {
      component['pageSize'].set(2);
      component['currentPage'].set(0);
      fixture.detectChanges();

      expect(component['paginatedProducts']().length).toBe(2);
      expect(component['paginatedProducts']()[0].id).toBe(1);
      expect(component['paginatedProducts']()[1].id).toBe(2);

      component['currentPage'].set(1);
      fixture.detectChanges();
      expect(component['paginatedProducts']().length).toBe(1);
      expect(component['paginatedProducts']()[0].id).toBe(3);
    });
  });

  describe('Form Management', () => {
    it('should open create form', () => {
      component['openCreateForm']();
      expect(component['showForm']()).toBe(true);
      expect(component['editingProduct']()).toBeNull();
      expect(component['newProduct']().reference).toBe('');
    });

    it('should open edit form with product data', () => {
      const product = mockProducts[0];
      component['openEditForm'](product);

      expect(component['showForm']()).toBe(true);
      expect(component['editingProduct']()).toEqual(product);
    });

    it('should close form', () => {
      component['openCreateForm']();
      component['closeForm']();

      expect(component['showForm']()).toBe(false);
      expect(component['editingProduct']()).toBeNull();
    });
  });

  describe('CRUD Operations', () => {
    it('should add a new product', async () => {
      const newProduct = { ...mockProducts[0], id: 4, reference: 'P4' };
      supabaseServiceSpy.createProduct.mockReturnValue(Promise.resolve(newProduct as any));

      component['openCreateForm']();
      component['newProduct'].set({
        reference: 'P4',
        description: 'Desc',
        manufacturer: 'Manuf',
        basePrice: 100,
        vatRate: 21,
        category: 'Cat',
        active: true
      });

      await component['addProduct']();

      expect(supabaseServiceSpy.createProduct).toHaveBeenCalled();
      expect(component['products']().length).toBe(4);
      expect(component['successMessage']()).toBe('Producto añadido correctamente');
      expect(component['showForm']()).toBe(false);
    });

    it('should validate required fields before adding', async () => {
      component['openCreateForm']();
      component['newProduct'].set({
        reference: '',
        description: '',
        manufacturer: '',
        basePrice: 100,
        vatRate: 21,
        category: '',
        active: true
      });

      await component['addProduct']();

      expect(supabaseServiceSpy.createProduct).not.toHaveBeenCalled();
      expect(component['errorMessage']()).toBe('Por favor, completa todos los campos obligatorios');
    });

    it('should update an existing product', async () => {
      const updatedProduct = { ...mockProducts[0], description: 'Updated Desc' };
      supabaseServiceSpy.updateProduct.mockReturnValue(Promise.resolve(updatedProduct as any));

      component['openEditForm'](mockProducts[0]);
      component['editingProduct'].set(updatedProduct);

      await component['saveProduct'](updatedProduct);

      expect(supabaseServiceSpy.updateProduct).toHaveBeenCalled();
      expect(component['products']().find(p => p.id === 1)?.description).toBe('Updated Desc');
      expect(component['successMessage']()).toBe('Producto actualizado correctamente');
      expect(component['showForm']()).toBe(false);
    });

    it('should delete a product', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      supabaseServiceSpy.deleteProduct.mockReturnValue(Promise.resolve());

      await component['deleteProduct'](1);

      expect(supabaseServiceSpy.deleteProduct).toHaveBeenCalledWith(1);
      expect(component['products']().find(p => p.id === 1)).toBeUndefined();
      expect(component['successMessage']()).toBe('Producto eliminado correctamente');
    });
  });

  describe('Price Calculations', () => {
    it('should calculate gross price correctly', () => {
      // 100 + 21% VAT = 121
      expect(component['calculateGrossPrice'](100, 21)).toBe(121);
    });

    it('should calculate base price from gross correctly', () => {
      // 121 / 1.21 = 100
      expect(component['calculateBasePriceFromGross'](121, 21)).toBe(100);
    });

    it('should update base price when gross price changes', () => {
      component['openCreateForm']();
      component['newProduct'].update(p => ({ ...p, vatRate: 21 }));

      const event = { target: { value: '121' } } as any;
      component['updateGrossPriceField'](event);

      expect(component['newProduct']().basePrice).toBe(100);
    });

    it('should update base price when VAT rate changes while tracking gross price', () => {
      component['openCreateForm']();
      component['newProduct'].update(p => ({ ...p, vatRate: 21 }));

      // Set gross price to 121 (base 100)
      const eventGross = { target: { value: '121' } } as any;
      component['updateGrossPriceField'](eventGross);

      // Change VAT to 10%
      const eventVat = { target: { value: '10' } } as any;
      component['updateNewProductField']('vatRate', eventVat);

      // Gross 121 with 10% VAT -> Base = 121 / 1.1 = 110
      expect(component['newProduct']().basePrice).toBe(110);
    });
  });
});
