import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';
import { DeliveryAddress } from '../../../models/delivery-address.model';

@Component({
  selector: 'app-delivery-addresses-page',
  imports: [FormsModule],
  templateUrl: './delivery-addresses-page.component.html',
  styleUrls: ['./delivery-addresses-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryAddressesPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  protected readonly addresses = signal<DeliveryAddress[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly searchTerm = signal<string>('');
  protected readonly showForm = signal<boolean>(false);
  protected readonly editingAddress = signal<DeliveryAddress | null>(null);
  protected readonly formData = signal<Omit<DeliveryAddress, 'id' | 'createdAt' | 'updatedAt'>>(this.createEmptyForm());
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected readonly pageSize = signal<number>(this.pageSizeOptions[1]);
  protected readonly currentPage = signal<number>(0);

  protected readonly filteredAddresses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.addresses();
    if (!term) return list;

    return list.filter(address => {
      const searchableValues = [
        address.name,
        address.address,
        address.city,
        address.contactName
      ]
        .filter((value): value is string => !!value)
        .map(value => value.toLowerCase());

      return searchableValues.some(value => value.includes(term));
    });
  });

  protected readonly totalAddresses = computed(() => this.addresses().length);
  protected readonly totalFilteredAddresses = computed(() => this.filteredAddresses().length);

  protected readonly paginatedAddresses = computed(() => {
    const startIndex = this.currentPage() * this.pageSize();
    return this.filteredAddresses().slice(startIndex, startIndex + this.pageSize());
  });

  protected readonly paginationLabel = computed(() => {
    const total = this.totalFilteredAddresses();
    if (total === 0) {
      return 'Mostrando 0 de 0';
    }

    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `Mostrando ${start} – ${end} de ${total}`;
  });

  protected readonly pagePosition = computed(() => {
    const total = this.totalFilteredAddresses();
    if (total === 0) {
      return 'Página 0 de 0';
    }
    return `Página ${this.currentPage() + 1} de ${this.totalPages()}`;
  });

  protected readonly totalPages = computed(() => {
    const total = this.totalFilteredAddresses();
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
    this.loadAddresses();
  }

  protected async loadAddresses(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const addresses = await this.supabase.getDeliveryAddresses();
      this.addresses.set(addresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
      this.errorMessage.set('No se pudieron cargar las direcciones de entrega.');
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
    this.editingAddress.set(null);
    this.formData.set(this.createEmptyForm());
    this.showForm.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  protected openEditForm(address: DeliveryAddress): void {
    this.editingAddress.set(address);
    this.formData.set({
      name: address.name ?? '',
      address: address.address ?? '',
      city: address.city ?? '',
      postalCode: address.postalCode ?? '',
      contactName: address.contactName ?? '',
      contactPhone: address.contactPhone ?? '',
      isDefault: address.isDefault ?? false
    });
    this.showForm.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingAddress.set(null);
    this.formData.set(this.createEmptyForm());
  }

  protected async saveAddress(): Promise<void> {
    const data = this.formData();
    const editing = this.editingAddress();

    if (!data.name.trim()) {
      this.errorMessage.set('El nombre de la dirección es obligatorio.');
      return;
    }

    if (!data.address.trim()) {
      this.errorMessage.set('La dirección es obligatoria.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      if (editing) {
        await this.supabase.updateDeliveryAddress(editing.id, {
          name: data.name.trim(),
          address: data.address.trim(),
          city: data.city?.trim() || null,
          postalCode: data.postalCode?.trim() || null,
          contactName: data.contactName?.trim() || null,
          contactPhone: data.contactPhone?.trim() || null,
          isDefault: data.isDefault
        });
        this.successMessage.set(`Dirección "${data.name}" actualizada correctamente.`);
      } else {
        await this.supabase.createDeliveryAddress({
          name: data.name.trim(),
          address: data.address.trim(),
          city: data.city?.trim() || null,
          postalCode: data.postalCode?.trim() || null,
          contactName: data.contactName?.trim() || null,
          contactPhone: data.contactPhone?.trim() || null,
          isDefault: data.isDefault
        });
        this.successMessage.set(`Dirección "${data.name}" creada correctamente.`);
      }

      this.closeForm();
      await this.loadAddresses();
    } catch (error) {
      console.error('Error saving address:', error);
      this.errorMessage.set('Error al guardar la dirección.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async deleteAddress(address: DeliveryAddress): Promise<void> {
    if (!confirm(`¿Estás seguro de que quieres eliminar la dirección "${address.name}"?`)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.supabase.deleteDeliveryAddress(address.id);
      this.successMessage.set(`Dirección "${address.name}" eliminada correctamente.`);
      await this.loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      this.errorMessage.set('Error al eliminar la dirección. Puede que tenga pedidos asociados.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async setAsDefault(address: DeliveryAddress): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.supabase.updateDeliveryAddress(address.id, { isDefault: true });
      this.successMessage.set(`"${address.name}" establecida como dirección predeterminada.`);
      await this.loadAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      this.errorMessage.set('Error al establecer la dirección predeterminada.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected updateFormField(field: keyof Omit<DeliveryAddress, 'id' | 'createdAt' | 'updatedAt'>, value: string | boolean): void {
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

  private createEmptyForm(): Omit<DeliveryAddress, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: '',
      address: '',
      city: '',
      postalCode: '',
      contactName: '',
      contactPhone: '',
      isDefault: false
    };
  }
}
