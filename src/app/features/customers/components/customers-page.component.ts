import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';
import { Customer, CustomerPayload } from '../../../models/customer.model';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-page.component.html',
  styleUrls: ['./customers-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomersPageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly searchTerm = signal<string>('');
  protected readonly showForm = signal<boolean>(false);
  protected readonly editingCustomer = signal<Customer | null>(null);
  protected readonly formData = signal<CustomerPayload>(this.createEmptyForm());

  protected readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.customers();
    if (!term) return list;

    return list.filter(customer => {
      const searchableValues = [
        customer.name,
        customer.email,
        customer.phone,
        customer.city,
        customer.dni
      ]
        .filter((value): value is string => !!value)
        .map(value => value.toLowerCase());

      return searchableValues.some(value => value.includes(term));
    });
  });

  protected readonly totalCustomers = computed(() => this.customers().length);
  protected readonly lastUpdated = computed(() => {
    const timestamps = this.customers()
      .map(customer => customer.updatedAt ?? customer.createdAt)
      .filter((value): value is string => !!value);

    if (timestamps.length === 0) return null;

    return timestamps.reduce((latest, current) =>
      new Date(current) > new Date(latest) ? current : latest
    );
  });

  protected readonly uniqueCities = computed(() => {
    const cities = this.customers()
      .map(customer => customer.city?.trim().toLowerCase())
      .filter((value): value is string => !!value);
    return new Set(cities).size;
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  protected async loadCustomers(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const customers = await this.supabase.getCustomers();
      this.customers.set(customers);
    } catch (error) {
      console.error('Error loading customers:', error);
      this.errorMessage.set('No se pudieron cargar los clientes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected openCreateForm(): void {
    this.editingCustomer.set(null);
    this.formData.set(this.createEmptyForm());
    this.showForm.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  protected openEditForm(customer: Customer): void {
    this.editingCustomer.set(customer);
    this.formData.set({
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      postalCode: customer.postalCode ?? '',
      dni: customer.dni ?? '',
      notes: customer.notes ?? ''
    });
    this.showForm.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingCustomer.set(null);
    this.formData.set(this.createEmptyForm());
  }

  protected updateFormField(field: keyof CustomerPayload, event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = input.value;
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  protected async saveCustomer(): Promise<void> {
    const payload = this.formData();
    if (!payload.name?.trim()) {
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      let result: Customer;
      if (this.editingCustomer()) {
        result = await this.supabase.updateCustomer(this.editingCustomer()!.id, payload);
        this.customers.update(list => list.map(item => item.id === result.id ? result : item));
        this.successMessage.set('Cliente actualizado correctamente.');
      } else {
        result = await this.supabase.createCustomer(payload);
        this.customers.update(list => [result, ...list]);
        this.successMessage.set('Cliente creado correctamente.');
      }

      this.cancelForm();
    } catch (error) {
      console.error('Error saving customer:', error);
      this.errorMessage.set('No se pudo guardar el cliente.');
    } finally {
      this.isLoading.set(false);
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  protected async deleteCustomer(customer: Customer): Promise<void> {
    const confirmation = confirm(`¿Eliminar al cliente ${customer.name}?`);
    if (!confirmation) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.supabase.deleteCustomer(customer.id);
      this.customers.update(list => list.filter(item => item.id !== customer.id));
      this.successMessage.set('Cliente eliminado.');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      if (error?.code === '23503') {
        this.errorMessage.set('No se puede eliminar el cliente porque tiene presupuestos asociados. Elimina primero los presupuestos relacionados.');
      } else {
        this.errorMessage.set('No se pudo eliminar el cliente.');
      }
    } finally {
      this.isLoading.set(false);
      setTimeout(() => this.successMessage.set(null), 3000);
    }
  }

  protected isEditing(): boolean {
    return !!this.editingCustomer();
  }

  private createEmptyForm(): CustomerPayload {
    return {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      dni: '',
      notes: ''
    };
  }
}
