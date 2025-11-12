import { ChangeDetectionStrategy, Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, CreateProductDto } from '../../../models/product.model';
import { SupabaseService } from '../../../services/supabase.service';

/**
 * Componente para gestión del catálogo de productos
 * Permite añadir, editar y eliminar productos
 */
@Component({
  selector: 'app-products-catalog',
  templateUrl: './products-catalog.component.html',
  styleUrls: ['./products-catalog.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsCatalogComponent {
  private readonly supabaseService = inject(SupabaseService);

  // Lista de productos
  protected readonly products = signal<Product[]>([]);

  // Producto en edición
  protected readonly editingProduct = signal<Product | null>(null);

  // Nuevo producto
  protected readonly newProduct = signal<CreateProductDto>({
    reference: '',
    description: '',
    manufacturer: '',
    base_price: 0,
    vat_rate: 21,
    category: '',
    active: true
  });

  // Estados de UI
  protected readonly isLoading = signal<boolean>(false);
  protected readonly showAddForm = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly successMessage = signal<string>('');
  protected readonly searchTerm = signal<string>('');

  // Productos filtrados
  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.products();

    return this.products().filter(p =>
      p.reference.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.manufacturer.toLowerCase().includes(term)
    );
  });

  constructor() {
    this.loadProducts();
  }

  /**
   * Carga todos los productos desde Supabase
   */
  protected async loadProducts(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const products = await this.supabaseService.getProducts();
      this.products.set(products);
    } catch (error) {
      this.errorMessage.set('Error al cargar los productos');
      console.error('Error loading products:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Muestra/oculta el formulario de nuevo producto
   */
  protected toggleAddForm(): void {
    this.showAddForm.update(show => !show);
    if (!this.showAddForm()) {
      this.resetNewProduct();
    }
    this.clearMessages();
  }

  /**
   * Añade un nuevo producto
   */
  protected async addProduct(): Promise<void> {
    const product = this.newProduct();

    // Validaciones
    if (!product.reference || !product.description || !product.manufacturer) {
      this.errorMessage.set('Por favor, completa todos los campos obligatorios');
      return;
    }

    if (product.base_price <= 0) {
      this.errorMessage.set('El precio debe ser mayor que 0');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const newProduct = await this.supabaseService.createProduct(product);
      this.products.update(products => [...products, newProduct]);
      this.successMessage.set('Producto añadido correctamente');
      this.resetNewProduct();
      this.showAddForm.set(false);

      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set('Error al añadir el producto');
      console.error('Error adding product:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Inicia la edición de un producto
   */
  protected startEdit(product: Product): void {
    this.editingProduct.set({ ...product });
    this.clearMessages();
  }

  /**
   * Cancela la edición
   */
  protected cancelEdit(): void {
    this.editingProduct.set(null);
    this.clearMessages();
  }

  /**
   * Guarda los cambios de un producto
   */
  protected async saveProduct(product: Product): Promise<void> {
    if (!product.id) return;

    // Validaciones
    if (!product.reference || !product.description || !product.manufacturer) {
      this.errorMessage.set('Por favor, completa todos los campos obligatorios');
      return;
    }

    if (product.base_price <= 0) {
      this.errorMessage.set('El precio debe ser mayor que 0');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const updated = await this.supabaseService.updateProduct(product.id, product);
      this.products.update(products =>
        products.map(p => p.id === updated.id ? updated : p)
      );
      this.editingProduct.set(null);
      this.successMessage.set('Producto actualizado correctamente');

      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set('Error al actualizar el producto');
      console.error('Error updating product:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Elimina un producto
   */
  protected async deleteProduct(productId: string): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.supabaseService.deleteProduct(productId);
      this.products.update(products => products.filter(p => p.id !== productId));
      this.successMessage.set('Producto eliminado correctamente');

      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error) {
      this.errorMessage.set('Error al eliminar el producto');
      console.error('Error deleting product:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Actualiza el campo de búsqueda
   */
  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  /**
   * Actualiza un campo del nuevo producto
   */
  protected updateNewProductField(field: keyof CreateProductDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = field === 'base_price' || field === 'vat_rate'
      ? parseFloat(input.value)
      : field === 'active'
        ? (input as HTMLInputElement).checked
        : input.value;

    this.newProduct.update(product => ({ ...product, [field]: value }));
  }

  /**
   * Actualiza un campo del producto en edición
   */
  protected updateEditingProductField(field: keyof Product, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = field === 'base_price' || field === 'vat_rate'
      ? parseFloat(input.value)
      : field === 'active'
        ? (input as HTMLInputElement).checked
        : input.value;

    this.editingProduct.update(product =>
      product ? { ...product, [field]: value } : null
    );
  }

  /**
   * Resetea el formulario de nuevo producto
   */
  private resetNewProduct(): void {
    this.newProduct.set({
      reference: '',
      description: '',
      manufacturer: '',
      base_price: 0,
      vat_rate: 21,
      category: '',
      active: true
    });
  }

  /**
   * Limpia los mensajes de éxito/error
   */
  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
