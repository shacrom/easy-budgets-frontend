import { ChangeDetectionStrategy, Component, input, output, computed, signal, effect, ViewChild, ElementRef } from '@angular/core';
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
export class MaterialRowComponent {
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

  // Calculated total price
  protected readonly totalPrice = computed(() => {
    const mat = this.material();
    return mat.quantity * mat.unitPrice;
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
    effect(() => {
      const currentReference = this.material().reference ?? '';
      this.referenceSearchTerm.set(currentReference);
    });

    // When edit mode becomes true, ensure textarea resizes to content
    effect(() => {
      if (this.editMode()) {
        // Defer to next tick so DOM is updated
        setTimeout(() => this.resizeDescriptionTextarea(), 0);
      }
    });
  }

  /**
   * Updates total price when quantity or unit price changes
   */
  protected onValueChange(): void {
    const updatedMaterial: Material = {
      ...this.material(),
      totalPrice: this.material().quantity * this.material().unitPrice
    };
    this.materialUpdated.emit(updatedMaterial);
  }

  protected onReferenceChange(value: string): void {
    this.referenceSearchTerm.set(value);
    this.openReferenceDropdown();
    this.onValueChange();
  }

  protected openReferenceDropdown(): void {
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

    const currentMaterial = this.material();
    const resolvedQuantity = currentMaterial.quantity > 0 ? currentMaterial.quantity : 1;
    const resolvedUnitPrice = product.basePrice ?? currentMaterial.unitPrice;

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

    this.referenceSearchTerm.set(product.reference);
    this.referenceDropdownOpen.set(false);
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
   * Handler for description change (ngModelChange). Emits updated material.
   */
  protected onDescriptionChange(value: string): void {
    const updatedMaterial: Material = {
      ...this.material(),
      description: value
    };
    this.materialUpdated.emit(updatedMaterial);
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
