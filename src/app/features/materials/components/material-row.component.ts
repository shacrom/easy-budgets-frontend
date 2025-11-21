import { ChangeDetectionStrategy, Component, input, output, computed, signal, effect } from '@angular/core';
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
  materialDeleted = output<string>();

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

  constructor() {
    effect(() => {
      const currentReference = this.material().reference ?? '';
      this.referenceSearchTerm.set(currentReference);
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
    const shouldReplaceDescription = !currentMaterial.description?.trim().length;
    const shouldReplaceManufacturer = !currentMaterial.manufacturer?.trim().length;
    const resolvedUnitPrice = currentMaterial.unitPrice > 0
      ? currentMaterial.unitPrice
      : product.basePrice ?? currentMaterial.unitPrice;

    const updatedMaterial: Material = {
      ...currentMaterial,
      productId: product.id ?? currentMaterial.productId,
      reference: product.reference,
      description: shouldReplaceDescription ? product.description : currentMaterial.description,
      manufacturer: shouldReplaceManufacturer ? product.manufacturer : currentMaterial.manufacturer,
      unitPrice: resolvedUnitPrice,
      totalPrice: currentMaterial.quantity * resolvedUnitPrice
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
}
