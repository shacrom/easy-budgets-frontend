import { ChangeDetectionStrategy, Component, input, output, computed, signal, effect, ViewChild, ElementRef, OnInit } from '@angular/core';
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

  // Input: edit mode
  editMode = input<boolean>(false);

  // Input: available products for reference search
  products = input<Product[]>([]);

  // Output: event when material is updated
  materialUpdated = output<Material>();

  // Output: event when material is deleted
  materialDeleted = output<number>();

  // Local signals for form values to prevent focus loss on re-render
  protected readonly localReference = signal('');
  protected readonly localDescription = signal('');
  protected readonly localManufacturer = signal('');
  protected readonly localQuantity = signal(0);
  protected readonly localUnitPrice = signal(0);

  // Track if local values have been initialized
  private initialized = false;

  // Debounce timer for update emissions
  private updateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 300;

  // Track last emitted values to avoid unnecessary updates
  private lastEmittedValues = {
    reference: '',
    description: '',
    manufacturer: '',
    quantity: 0,
    unitPrice: 0
  };

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

  constructor() {
    // When edit mode becomes true, ensure textarea resizes to content
    effect(() => {
      if (this.editMode()) {
        // Defer to next tick so DOM is updated
        setTimeout(() => this.resizeDescriptionTextarea(), 0);
      }
    });
  }

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

    // Initialize last emitted values
    this.updateLastEmittedValues();
    this.initialized = true;
  }

  /**
   * Checks if local values have changed from last emission
   */
  private hasChanges(): boolean {
    return (
      this.localReference() !== this.lastEmittedValues.reference ||
      this.localDescription() !== this.lastEmittedValues.description ||
      this.localManufacturer() !== this.lastEmittedValues.manufacturer ||
      this.localQuantity() !== this.lastEmittedValues.quantity ||
      this.localUnitPrice() !== this.lastEmittedValues.unitPrice
    );
  }

  /**
   * Updates last emitted values cache
   */
  private updateLastEmittedValues(): void {
    this.lastEmittedValues = {
      reference: this.localReference(),
      description: this.localDescription(),
      manufacturer: this.localManufacturer(),
      quantity: this.localQuantity(),
      unitPrice: this.localUnitPrice()
    };
  }

  /**
   * Builds and emits the updated material from local signals (debounced)
   */
  private emitUpdate(): void {
    // Clear existing debounce timer
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }

    // Debounce the update to avoid re-renders on every keystroke
    this.updateDebounceTimer = setTimeout(() => {
      // Only emit if values have actually changed
      if (!this.hasChanges()) {
        this.updateDebounceTimer = null;
        return;
      }

      const updatedMaterial: Material = {
        ...this.material(),
        reference: this.localReference(),
        description: this.localDescription(),
        manufacturer: this.localManufacturer(),
        quantity: this.localQuantity(),
        unitPrice: this.localUnitPrice(),
        totalPrice: this.localQuantity() * this.localUnitPrice()
      };
      this.updateLastEmittedValues();
      this.materialUpdated.emit(updatedMaterial);
      this.updateDebounceTimer = null;
    }, this.DEBOUNCE_MS);
  }

  /**
   * Emits update immediately without debounce (for blur events)
   */
  private emitUpdateImmediate(): void {
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }

    // Only emit if values have actually changed
    if (!this.hasChanges()) {
      return;
    }

    const updatedMaterial: Material = {
      ...this.material(),
      reference: this.localReference(),
      description: this.localDescription(),
      manufacturer: this.localManufacturer(),
      quantity: this.localQuantity(),
      unitPrice: this.localUnitPrice(),
      totalPrice: this.localQuantity() * this.localUnitPrice()
    };
    this.updateLastEmittedValues();
    this.materialUpdated.emit(updatedMaterial);
  }

  /**
   * Updates local reference and emits change
   */
  protected onReferenceChange(value: string): void {
    this.localReference.set(value);
    this.referenceSearchTerm.set(value);
    this.openReferenceDropdown();
    this.emitUpdate();
  }

  /**
   * Updates local manufacturer and emits change
   */
  protected onManufacturerChange(value: string): void {
    this.localManufacturer.set(value);
    this.emitUpdate();
  }

  /**
   * Updates local quantity and emits change
   */
  protected onQuantityChange(value: number): void {
    this.localQuantity.set(value ?? 0);
    this.emitUpdate();
  }

  /**
   * Updates local unit price and emits change
   */
  protected onUnitPriceChange(value: number): void {
    this.localUnitPrice.set(value ?? 0);
    this.emitUpdate();
  }

  protected openReferenceDropdown(): void {
    this.clearDropdownTimeout();
    this.referenceDropdownOpen.set(true);
  }

  protected closeReferenceDropdown(): void {
    this.clearDropdownTimeout();
    this.referenceDropdownTimeout = setTimeout(() => this.referenceDropdownOpen.set(false), 120);
  }

  /**
   * Handles blur event on any input - emits update immediately
   */
  protected onBlur(): void {
    this.closeReferenceDropdown();
    this.emitUpdateImmediate();
  }

  protected applyProductFromSuggestion(event: MouseEvent, product: Product): void {
    event.preventDefault();
    this.clearDropdownTimeout();

    const currentMaterial = this.material();
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

    const updatedMaterial: Material = {
      ...currentMaterial,
      productId: product.id ?? currentMaterial.productId,
      reference: product.reference,
      description: product.description,
      manufacturer: product.manufacturer,
      quantity: resolvedQuantity,
      unitPrice: resolvedUnitPrice,
      totalPrice: resolvedQuantity * resolvedUnitPrice
    };

    this.updateLastEmittedValues();
    this.materialUpdated.emit(updatedMaterial);
  }

  private clearDropdownTimeout(): void {
    if (this.referenceDropdownTimeout) {
      clearTimeout(this.referenceDropdownTimeout);
      this.referenceDropdownTimeout = null;
    }
  }

  /**
   * Deletes the material
   */
  protected deleteMaterial(): void {
    this.materialDeleted.emit(this.material().id);
  }

  /**
   * Handler for description change. Updates local signal and emits updated material.
   */
  protected onDescriptionChange(value: string): void {
    this.localDescription.set(value);
    this.emitUpdate();
  }

  /**
   * Auto-resize textarea on input and emit updated material.
   */
  protected onDescriptionInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    // reset height to auto to correctly compute scrollHeight
    target.style.height = 'auto';
    const newHeight = Math.max(target.scrollHeight, 38);
    target.style.height = `${newHeight}px`;
    // emit updated material
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
