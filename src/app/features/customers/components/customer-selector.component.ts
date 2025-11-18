import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../../models/customer.model';

@Component({
  selector: 'app-customer-selector',
  standalone: true,
  templateUrl: './customer-selector.component.html',
  styleUrls: ['./customer-selector.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerSelectorComponent {
  customers = input<Customer[]>([]);
  selectedCustomerId = input<string | null>(null);
  selectedCustomer = input<Customer | null>(null);
  loading = input<boolean>(false);
  updating = input<boolean>(false);
  errorMessage = input<string | null>(null);

  customerSelected = output<string | null>();

  protected readonly searchTerm = signal('');

  protected readonly filteredCustomers = computed(() => {
    const list = this.customers() ?? [];
    const term = this.searchTerm().trim().toLowerCase();

    if (!term) {
      return list.slice(0, 12);
    }

    return list
      .filter(customer => {
        const values = [
          customer.name,
          customer.email ?? '',
          customer.phone ?? '',
          customer.city ?? '',
          customer.dni ?? '',
          customer.taxId ?? ''
        ];

        return values.some(value => value?.toLowerCase().includes(term));
      })
      .slice(0, 12);
  });

  protected readonly hasCustomers = computed(() => (this.customers()?.length ?? 0) > 0);

  protected updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  protected selectCustomer(customerId: string): void {
    if (this.selectedCustomerId() === customerId || this.updating()) {
      return;
    }
    this.customerSelected.emit(customerId);
  }

  protected clearSelection(): void {
    if (this.updating()) {
      return;
    }
    this.customerSelected.emit(null);
  }
}
