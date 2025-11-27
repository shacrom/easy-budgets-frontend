import { ChangeDetectionStrategy, Component, input, output, computed, signal, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Material } from '../../../models/material.model';
import { Product } from '../../../models/product.model';

/**
 * Component to display and edit a material row in the table
 */
@Component({
  selector: 'app-material-row',
  templateUrl: './material-row.component.html',
  styleUrls: ['./material-row.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialRowComponent implements OnInit {
  // Input: material data
  material = input.required<Material>();

  // Input: available products for reference search
  products = input<Product[]>([]);

  // Output: event when user requests to delete material
  deleteRequested = output<number>();

  // Output: event when local values change (not saved yet)
  localValuesChanged = output<void>();

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
  @ViewChild('descTextarea') protected descTextareaRef?: ElementRef<HTMLTextAreaElement>;

  ngOnInit(): void {
    // Initialize local signals from input only once
    this.syncFromInput();
  }

  /**
   * Syncs local signals from the material input (called only on init)
   */
  private syncFromInput(): void {
    if (this.initialized) return;
    const mat = this.material();
    this.localReference.set(mat.reference ?? '');
    this.localDescription.set(mat.description ?? '');
    this.localManufacturer.set(mat.manufacturer ?? '');
    this.localQuantity.set(mat.quantity ?? 0);
    this.localUnitPrice.set(mat.unitPrice ?? 0);
    this.referenceSearchTerm.set(mat.reference ?? '');
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
  }  protected openReferenceDropdown(): void {
    this.clearDropdownTimeout();
    this.referenceDropdownOpen.set(true);
  }

  protected closeReferenceDropdown(): void {
    this.clearDropdownTimeout();
    this.referenceDropdownTimeout = setTimeout(() => this.referenceDropdownOpen.set(false), 120);
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
   * Returns the current material with local values applied
   * Used by parent component when saving
   */
  getCurrentMaterial(): Material {
    return {
      ...this.material(),
      reference: this.localReference(),
      description: this.localDescription(),
      manufacturer: this.localManufacturer(),
      quantity: this.localQuantity(),
      unitPrice: this.localUnitPrice(),
      totalPrice: this.localQuantity() * this.localUnitPrice()
    };
  }

  /**
   * Requests deletion of this material
   */
  protected requestDelete(): void {
    this.deleteRequested.emit(this.material().id);
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
