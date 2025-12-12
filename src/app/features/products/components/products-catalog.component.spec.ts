import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsCatalogComponent } from './products-catalog.component';
import { SupabaseService } from '../../../services/supabase.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { Product } from '../../../models/product.model';
import { of } from 'rxjs';

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
    it('should open create dialog', () => {
      const dialogSpy = vi.spyOn(component['dialog'], 'open').mockReturnValue({
        afterClosed: () => of(undefined)
      } as any);

      component['openCreateForm']();

      expect(dialogSpy).toHaveBeenCalled();
      const callArgs = dialogSpy.mock.calls[0];
      expect(callArgs[1]?.data?.prefillData).toEqual({});
      expect(callArgs[1]?.width).toBe('600px');
    });

    it('should open edit dialog with product data', () => {
      const product = mockProducts[0];
      const dialogSpy = vi.spyOn(component['dialog'], 'open').mockReturnValue({
        afterClosed: () => of(undefined)
      } as any);

      component['openEditForm'](product);

      expect(dialogSpy).toHaveBeenCalled();
      const callArgs = dialogSpy.mock.calls[0];
      expect(callArgs[1]?.data?.isEditing).toBe(true);
      expect(callArgs[1]?.data?.productId).toBe(product.id);
    });
  });

  describe('CRUD Operations', () => {
    it('should add a new product via dialog', (done) => {
      const newProduct = { ...mockProducts[0], id: 4, reference: 'P4' };
      supabaseServiceSpy.createProduct.mockReturnValue(Promise.resolve(newProduct as any));

      const dialogRefMock = {
        afterClosed: vi.fn().mockReturnValue(of({ created: true, product: newProduct }))
      };
      vi.spyOn(component['dialog'], 'open').mockReturnValue(dialogRefMock as any);

      component['openCreateForm']();

      // Wait for afterClosed subscription to complete
      setTimeout(() => {
        expect(component['products']().length).toBe(4);
        expect(component['successMessage']()).toBe('Producto añadido correctamente');
        done();
      }, 50);
    });

    it('should update an existing product via dialog', (done) => {
      const updatedProduct = { ...mockProducts[0], description: 'Updated Desc' };
      supabaseServiceSpy.updateProduct.mockReturnValue(Promise.resolve(updatedProduct as any));

      const dialogRefMock = {
        afterClosed: vi.fn().mockReturnValue(of({ updated: true, product: updatedProduct }))
      };
      vi.spyOn(component['dialog'], 'open').mockReturnValue(dialogRefMock as any);

      component['openEditForm'](mockProducts[0]);

      // Wait for afterClosed subscription to complete
      setTimeout(() => {
        expect(component['products']().find(p => p.id === 1)?.description).toBe('Updated Desc');
        expect(component['successMessage']()).toBe('Producto actualizado correctamente');
        done();
      }, 50);
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

  // Price calculations are now handled inside ProductFormDialogComponent
  // These tests are no longer needed in products-catalog.component.spec.ts
});
