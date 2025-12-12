import { ChangeDetectionStrategy, Component, signal, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Product, CreateProductDto } from '../../../models/product.model';
import { SupabaseService } from '../../../services/supabase.service';
import { ProductFormDialogComponent, ProductFormDialogResult } from './product-form-dialog.component';

/**
 * Componente para gestión del catálogo de productos
 * Permite añadir, editar y eliminar productos
 */
@Component({
  selector: 'app-products-catalog',
  templateUrl: './products-catalog.component.html',
  styleUrls: ['./products-catalog.component.css'],
  imports: [FormsModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsCatalogComponent {
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected readonly pageSize = signal<number>(this.pageSizeOptions[2]);
  protected readonly currentPage = signal<number>(0);

  private readonly supabaseService = inject(SupabaseService);
  private readonly dialog = inject(MatDialog);

  // Lista de productos
  protected readonly products = signal<Product[]>([]);

  // Estados de UI
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly successMessage = signal<string>('');
  protected readonly searchTerm = signal<string>('');
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
   * Opens dialog to create a new product
   */
  protected openCreateForm(): void {
    this.clearMessages();
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '600px',
      data: { prefillData: {} }
    });

    dialogRef.afterClosed().subscribe((result: ProductFormDialogResult | undefined) => {
      if (result?.created && result.product) {
        this.products.update(products => [...products, result.product!]);
        this.successMessage.set('Producto añadido correctamente');
        setTimeout(() => this.successMessage.set(''), 3000);
      }
    });
  }



  /**
   * Opens dialog to edit an existing product
   */
  protected openEditForm(product: Product): void {
    this.clearMessages();
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '600px',
      data: { 
        prefillData: product,
        isEditing: true,
        productId: product.id
      }
    });

    dialogRef.afterClosed().subscribe((result: ProductFormDialogResult | undefined) => {
      if (result?.created && result.product) {
        this.products.update(products => 
          products.map(p => p.id === result.product!.id ? result.product! : p)
        );
        this.successMessage.set('Producto actualizado correctamente');
        setTimeout(() => this.successMessage.set(''), 3000);
      }
    });
  }



  /**
   * Elimina un producto
   */
  protected async deleteProduct(productId: number): Promise<void> {
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
    this.currentPage.set(0);
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
}
