import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Customer } from '../../../models/customer.model';

@Component({
  selector: 'app-customer-selector',
  standalone: true,
  templateUrl: './customer-selector.component.html',
  styleUrls: ['./customer-selector.component.css'],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerSelectorComponent {
  customers = input<Customer[]>([]);
  searchTerm = input<string>('');
  selectedCustomerId = input<number | null>(null);
  selectedCustomer = input<Customer | null>(null);
  loading = input<boolean>(false);
  updating = input<boolean>(false);
  errorMessage = input<string | null>(null);

  customerSelected = output<number | null>();
  searchChanged = output<string>();
  refreshRequested = output<void>();

  protected readonly hasCustomers = computed(() => (this.customers()?.length ?? 0) > 0);
  protected readonly meetsSearchThreshold = computed(() => this.searchTerm().trim().length >= 2);

  protected updateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    this.searchChanged.emit(value);
  }

  protected retrySearch(): void {
    this.refreshRequested.emit();
  }

  protected clearSearch(): void {
    if (this.loading()) {
      return;
    }
    this.searchChanged.emit('');
  }

  protected selectCustomer(customerId: number): void {
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
