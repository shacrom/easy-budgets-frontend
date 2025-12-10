import { ChangeDetectionStrategy, Component, input, output, computed, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemRow } from '../../../../models/item-table.model';
import { Product } from '../../../../models/product.model';

/**
 * Component to display and edit an item row in the table
 */
@Component({
  selector: 'app-item-row',
  templateUrl: './item-row.component.html',
  styleUrls: ['./item-row.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemRowComponent implements OnInit {
  // Input: row data
  row = input.required<ItemRow>();

  // Input: available products for reference search
  products = input<Product[]>([]);

  // Input: visibility of columns for this row
  showReference = input<boolean>(true);
  showDescription = input<boolean>(true);
  showManufacturer = input<boolean>(true);
  showQuantity = input<boolean>(true);
  showUnitPrice = input<boolean>(true);
  showTotalPrice = input<boolean>(true);

  // Output: event when user requests to delete item
  deleteRequested = output<number>();

  // Output: event when local values change (not saved yet)
  localValuesChanged = output<void>();

  // Output: event when dropdown state changes
  dropdownStateChanged = output<boolean>();

  // Local signals for form values
  protected readonly localReference = signal('');
  protected readonly localDescription = signal('');
  protected readonly localManufacturer = signal('');
  protected readonly localQuantity = signal(0);
  protected readonly localUnitPrice = signal(0);

  // Track if local values have been initialized
  private initialized = false;

  // Calculated total price using local values
  protected readonly totalPrice = computed(() => {
    return this.localQuantity() * this.localUnitPrice();
  });

  // Reference search helpers
  private readonly referenceSearchTerm = signal('');
  protected readonly referenceDropdownOpen = signal(false);
  protected readonly dropdownPosition = signal({ top: 0, left: 0 });
  protected readonly referenceMatches = computed(() => {
    const catalog = this.products() ?? [];
    if (!catalog.length) {
      return [];
    }

    const term = this.referenceSearchTerm().trim().toLowerCase();
    if (!term) {
      return catalog.slice(0, 8);
    }

    return catalog
      .filter(product =>
        product.reference.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
      )
      .slice(0, 8);
  });

  private referenceDropdownTimeout: ReturnType<typeof setTimeout> | null = null;
  @ViewChild('referenceInput') protected referenceInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('descTextarea') protected descTextareaRef?: ElementRef<HTMLTextAreaElement>;

  ngOnInit(): void {
    // Initialize local signals from input only once
    this.syncFromInput();
  }

  /**
   * Syncs local signals from the row input (called only on init)
   */
  private syncFromInput(): void {
    if (this.initialized) return;
    const rowData = this.row();
    this.localReference.set(rowData.reference ?? '');
    this.localDescription.set(rowData.description ?? '');
    this.localManufacturer.set(rowData.manufacturer ?? '');
    this.localQuantity.set(rowData.quantity ?? 0);
    this.localUnitPrice.set(rowData.unitPrice ?? 0);
    this.referenceSearchTerm.set(rowData.reference ?? '');
    this.initialized = true;
  }

  /**
   * Updates local reference
   */
  protected onReferenceChange(value: string): void {
    this.localReference.set(value);
    this.referenceSearchTerm.set(value);
    this.openReferenceDropdown();
    this.localValuesChanged.emit();
  }

  /**
   * Updates local manufacturer
   */
  protected onManufacturerChange(value: string): void {
    this.localManufacturer.set(value);
    this.localValuesChanged.emit();
  }

  /**
   * Updates local quantity
   */
  protected onQuantityChange(value: number): void {
    this.localQuantity.set(value ?? 0);
    this.localValuesChanged.emit();
  }

  /**
   * Updates local unit price
   */
  protected onUnitPriceChange(value: number): void {
    this.localUnitPrice.set(value ?? 0);
    this.localValuesChanged.emit();
  }  protected openReferenceDropdown(event?: FocusEvent): void {
    this.clearDropdownTimeout();

    // Calculate position for fixed dropdown
    if (event && event.target instanceof HTMLElement) {
      const rect = event.target.getBoundingClientRect();
      this.dropdownPosition.set({
        top: rect.bottom + 4,
        left: rect.left
      });
    }

    this.referenceDropdownOpen.set(true);
    this.dropdownStateChanged.emit(true);
  }

  protected closeReferenceDropdown(): void {
    this.clearDropdownTimeout();
    this.referenceDropdownTimeout = setTimeout(() => {
      this.referenceDropdownOpen.set(false);
      this.dropdownStateChanged.emit(false);
    }, 120);
  }

  protected applyProductFromSuggestion(event: MouseEvent, product: Product): void {
    event.preventDefault();
    this.clearDropdownTimeout();

    const resolvedQuantity = this.localQuantity() > 0 ? this.localQuantity() : 1;
    const resolvedUnitPrice = product.basePrice ?? this.localUnitPrice();

    // Update local signals
    this.localReference.set(product.reference);
    this.localDescription.set(product.description);
    this.localManufacturer.set(product.manufacturer);
    this.localQuantity.set(resolvedQuantity);
    this.localUnitPrice.set(resolvedUnitPrice);
    this.referenceSearchTerm.set(product.reference);
    this.referenceDropdownOpen.set(false);

    // Notify parent of changes
    this.localValuesChanged.emit();
  }

  private clearDropdownTimeout(): void {
    if (this.referenceDropdownTimeout) {
      clearTimeout(this.referenceDropdownTimeout);
      this.referenceDropdownTimeout = null;
    }
  }

  /**
   * Handler for description change
   */
  protected onDescriptionChange(value: string): void {
    this.localDescription.set(value);
    this.localValuesChanged.emit();
  }

  /**
   * Returns the current row with local values applied
   * Used by parent component when saving
   */
  getCurrentRow(): ItemRow {
    return {
      ...this.row(),
      reference: this.localReference(),
      description: this.localDescription(),
      manufacturer: this.localManufacturer(),
      quantity: this.localQuantity(),
      unitPrice: this.localUnitPrice(),
      totalPrice: this.localQuantity() * this.localUnitPrice()
    };
  }

  /**
   * Requests deletion of this row
   */
  protected requestDelete(): void {
    this.deleteRequested.emit(this.row().id);
  }

  /**
   * Auto-resize textarea on input
   */
  protected onDescriptionInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    // reset height to auto to correctly compute scrollHeight
    target.style.height = 'auto';
    const newHeight = Math.max(target.scrollHeight, 38);
    target.style.height = `${newHeight}px`;
    // update local signal
    this.onDescriptionChange(target.value);
  }

  protected resizeDescriptionTextarea(): void {
    try {
      const el = (this as any).descTextareaRef?.nativeElement as HTMLTextAreaElement | undefined;
      // Query using the native DOM if ViewChild isn't set
      const textarea = el ?? (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement as HTMLTextAreaElement : null);
      if (!textarea) {
        // If not the active element, try to find via query (fallback)
        const node = (document as any).querySelector('textarea');
        if (node && node instanceof HTMLTextAreaElement) {
          node.style.height = 'auto';
          node.style.height = node.scrollHeight + 'px';
        }
        return;
      }
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(textarea.scrollHeight, 38) + 'px';
    } catch (e) {
      // no-op
    }
  }
}
