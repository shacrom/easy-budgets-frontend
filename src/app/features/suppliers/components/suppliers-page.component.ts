import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';
import { Supplier } from '../../../models/supplier.model';

@Component({
  selector: 'app-suppliers-page',
  imports: [FormsModule],
  templateUrl: './suppliers-page.component.html',
  styleUrls: ['./suppliers-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly searchTerm = signal<string>('');
  protected readonly showForm = signal<boolean>(false);
  protected readonly editingSupplier = signal<Supplier | null>(null);
  protected readonly formData = signal<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>(this.createEmptyForm());
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected readonly pageSize = signal<number>(this.pageSizeOptions[1]);
  protected readonly currentPage = signal<number>(0);

  protected readonly filteredSuppliers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.suppliers();
    if (!term) return list;

    return list.filter(supplier => {
      const searchableValues = [
        supplier.name,
        supplier.email,
        supplier.phone
      ]
        .filter((value): value is string => !!value)
        .map(value => value.toLowerCase());

      return searchableValues.some(value => value.includes(term));
    });
  });

  protected readonly totalSuppliers = computed(() => this.suppliers().length);
  protected readonly totalFilteredSuppliers = computed(() => this.filteredSuppliers().length);

  protected readonly paginatedSuppliers = computed(() => {
    const startIndex = this.currentPage() * this.pageSize();
    return this.filteredSuppliers().slice(startIndex, startIndex + this.pageSize());
  });

  protected readonly paginationLabel = computed(() => {
    const total = this.totalFilteredSuppliers();
    if (total === 0) {
      return 'Mostrando 0 de 0';
    }

    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `Mostrando ${start} – ${end} de ${total}`;
  });

  protected readonly pagePosition = computed(() => {
    const total = this.totalFilteredSuppliers();
    if (total === 0) {
      return 'Página 0 de 0';
    }
    return `Página ${this.currentPage() + 1} de ${this.totalPages()}`;
  });

  protected readonly totalPages = computed(() => {
    const total = this.totalFilteredSuppliers();
    return total === 0 ? 1 : Math.ceil(total / this.pageSize());
  });

  protected readonly isOnFirstPage = computed(() => this.currentPage() === 0);
  protected readonly isOnLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  constructor() {
    effect(() => {
      const totalPages = this.totalPages();
      const current = this.currentPage();
      if (current > totalPages - 1) {
        this.currentPage.set(Math.max(totalPages - 1, 0));
      }
    });
  }

  ngOnInit(): void {
    this.loadSuppliers();
  }

  protected async loadSuppliers(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const suppliers = await this.supabase.getSuppliers();
      this.suppliers.set(suppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      this.errorMessage.set('No se pudieron cargar los proveedores.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(0);
  }

  protected openCreateForm(): void {
    this.editingSupplier.set(null);
    this.formData.set(this.createEmptyForm());
    this.showForm.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  protected openEditForm(supplier: Supplier): void {
    this.editingSupplier.set(supplier);
    this.formData.set({
      name: supplier.name ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      notes: supplier.notes ?? ''
    });
    this.showForm.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingSupplier.set(null);
    this.formData.set(this.createEmptyForm());
  }

  protected async saveSupplier(): Promise<void> {
    const data = this.formData();
    const editing = this.editingSupplier();

    if (!data.name.trim()) {
      this.errorMessage.set('El nombre del proveedor es obligatorio.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      if (editing) {
        await this.supabase.updateSupplier(editing.id, {
          name: data.name.trim(),
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          notes: data.notes?.trim() || null
        });
        this.successMessage.set(`Proveedor "${data.name}" actualizado correctamente.`);
      } else {
        await this.supabase.createSupplier({
          name: data.name.trim(),
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          notes: data.notes?.trim() || null
        });
        this.successMessage.set(`Proveedor "${data.name}" creado correctamente.`);
      }

      this.closeForm();
      await this.loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      this.errorMessage.set('Error al guardar el proveedor.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async deleteSupplier(supplier: Supplier): Promise<void> {
    if (!confirm(`¿Estás seguro de que quieres eliminar el proveedor "${supplier.name}"?`)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.supabase.deleteSupplier(supplier.id);
      this.successMessage.set(`Proveedor "${supplier.name}" eliminado correctamente.`);
      await this.loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      this.errorMessage.set('Error al eliminar el proveedor. Puede que tenga productos o pedidos asociados.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected updateFormField(field: keyof Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>, value: string): void {
    this.formData.update(data => ({
      ...data,
      [field]: value
    }));
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(0);
  }

  protected goToFirstPage(): void {
    this.currentPage.set(0);
  }

  protected goToPreviousPage(): void {
    this.currentPage.update(current => Math.max(0, current - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update(current => Math.min(this.totalPages() - 1, current + 1));
  }

  protected goToLastPage(): void {
    this.currentPage.set(this.totalPages() - 1);
  }

  private createEmptyForm(): Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: '',
      email: '',
      phone: '',
      notes: ''
    };
  }
}
