import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Material } from '../../../models/material.model';

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

  // Output: event when material is updated
  materialUpdated = output<Material>();

  // Output: event when material is deleted
  materialDeleted = output<string>();

  // Calculated total price
  protected readonly totalPrice = computed(() => {
    const mat = this.material();
    return mat.quantity * mat.unitPrice;
  });

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

  /**
   * Deletes the material
   */
  protected deleteMaterial(): void {
    this.materialDeleted.emit(this.material().id);
  }
}
