import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
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
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected readonly pageSize = signal<number>(this.pageSizeOptions[0]);
  protected readonly currentPage = signal<number>(0);

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
    basePrice: 0,
    vatRate: 0,
    category: '',
    active: true
  });

  // Estados de UI
  protected readonly isLoading = signal<boolean>(false);
  protected readonly showForm = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly successMessage = signal<string>('');
  protected readonly searchTerm = signal<string>('');
  protected readonly isEditing = computed<boolean>(() => !!this.editingProduct());
  protected readonly formValues = computed<Product | CreateProductDto>(() => this.editingProduct() ?? this.newProduct());
  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.products();
    if (!term) {
      return list;
    }

    return list.filter(product => {
      const values = [
        product.reference,
        product.description,
        product.manufacturer,
        product.category
      ]
        .filter((value): value is string => !!value)
        .map(value => value.toLowerCase());
      return values.some(value => value.includes(term));
    });
  });

  protected readonly totalFilteredProducts = computed(() => this.filteredProducts().length);
  protected readonly totalPages = computed(() => {
    const total = this.totalFilteredProducts();
    return total === 0 ? 1 : Math.ceil(total / this.pageSize());
  });
  protected readonly paginatedProducts = computed(() => {
    const startIndex = this.currentPage() * this.pageSize();
    return this.filteredProducts().slice(startIndex, startIndex + this.pageSize());
  });

  protected readonly paginationLabel = computed(() => {
    const total = this.totalFilteredProducts();
    if (total === 0) {
      return 'Mostrando 0 de 0';
    }

    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `Mostrando ${start} – ${end} de ${total}`;
  });

  protected readonly pagePosition = computed(() => {
    const total = this.totalFilteredProducts();
    if (total === 0) {
      return 'Página 0 de 0';
    }
    return `Página ${this.currentPage() + 1} de ${this.totalPages()}`;
  });

  protected readonly isOnFirstPage = computed(() => this.currentPage() === 0);
  protected readonly isOnLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

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
  protected openCreateForm(): void {
    this.editingProduct.set(null);
    this.resetNewProduct();
    this.showForm.set(true);
    this.clearMessages();
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingProduct.set(null);
    this.resetNewProduct();
  }

  protected cancelForm(): void {
    this.closeForm();
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

    if (product.basePrice <= 0) {
      this.errorMessage.set('El precio debe ser mayor que 0');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const newProduct = await this.supabaseService.createProduct(product);
      this.products.update(products => [...products, newProduct]);
      this.successMessage.set('Producto añadido correctamente');
      this.closeForm();

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
  protected openEditForm(product: Product): void {
    this.editingProduct.set({ ...product });
    this.showForm.set(true);
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

    if (product.basePrice <= 0) {
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
      this.successMessage.set('Producto actualizado correctamente');
      this.closeForm();

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
      if (this.editingProduct()?.id === productId) {
        this.closeForm();
      }
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
    this.currentPage.set(0);
  }

  /**
   * Actualiza un campo del nuevo producto
   */
  protected updateNewProductField(field: keyof CreateProductDto, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = field === 'basePrice' || field === 'vatRate'
      ? this.parseNumber(input.value)
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
    const value = field === 'basePrice' || field === 'vatRate'
      ? this.parseNumber(input.value)
      : field === 'active'
        ? (input as HTMLInputElement).checked
        : input.value;

    this.editingProduct.update(product =>
      product ? { ...product, [field]: value } : null
    );
  }

  protected updateFormField(field: keyof CreateProductDto, event: Event): void {
    if (this.editingProduct()) {
      this.updateEditingProductField(field as keyof Product, event);
    } else {
      this.updateNewProductField(field, event);
    }
  }

  protected async submitForm(): Promise<void> {
    if (this.editingProduct()) {
      await this.saveProduct(this.editingProduct()!);
    } else {
      await this.addProduct();
    }
  }

  /**
   * Resetea el formulario de nuevo producto
   */
  private resetNewProduct(): void {
    this.newProduct.set({
      reference: '',
      description: '',
      manufacturer: '',
      basePrice: 0,
      vatRate: 0,
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

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(0);
  }

  protected goToFirstPage(): void {
    if (this.isOnFirstPage()) return;
    this.currentPage.set(0);
  }

  protected goToPreviousPage(): void {
    if (this.isOnFirstPage()) return;
    this.currentPage.update(page => Math.max(page - 1, 0));
  }

  protected goToNextPage(): void {
    if (this.isOnLastPage()) return;
    this.currentPage.update(page => Math.min(page + 1, this.totalPages() - 1));
  }

  protected goToLastPage(): void {
    if (this.isOnLastPage()) return;
    this.currentPage.set(this.totalPages() - 1);
  }

  private parseNumber(value: string): number {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
