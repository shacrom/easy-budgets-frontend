import { ChangeDetectionStrategy, Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRowComponent } from './material-row.component';
import { Material } from '../../../models/material.model';

/**
 * Container component for the materials table
 * Manages the complete list of budget materials
 */
@Component({
  selector: 'app-materials-table',
  templateUrl: './materials-table.component.html',
  styleUrls: ['./materials-table.component.css'],
  imports: [CommonModule, MaterialRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialsTableComponent {
  // List of materials
  protected readonly materials = signal<Material[]>([]);

  // Edit mode
  protected readonly editMode = signal<boolean>(true);

  // Total calculated from all materials
  protected readonly totalMaterials = computed(() => {
    return this.materials().reduce((sum, material) => sum + material.precioTotal, 0);
  });

  // Output: emits total when it changes
  totalChanged = output<number>();

  // Output: emits materials when they change
  materialsChanged = output<Material[]>();

  /**
   * Adds a new empty material
   */
  protected addNewMaterial(): void {
    const newMaterial: Material = {
      id: this.generateId(),
      descripcion: '',
      fabricante: '',
      cantidad: 0,
      precioUnitario: 0,
      precioTotal: 0
    };

    this.materials.update(materials => [...materials, newMaterial]);
    this.emitTotal();
  }

  /**
   * Updates an existing material
   */
  protected updateMaterial(updatedMaterial: Material): void {
    this.materials.update(materials =>
      materials.map(material => material.id === updatedMaterial.id ? updatedMaterial : material)
    );
    this.emitTotal();
  }

  /**
   * Deletes a material by its ID
   */
  protected deleteMaterial(materialId: string): void {
    this.materials.update(materials => materials.filter(material => material.id !== materialId));
    this.emitTotal();
  }

  /**
   * Toggles edit mode
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }

  /**
   * Emits the current total
   */
  private emitTotal(): void {
    this.totalChanged.emit(this.totalMaterials());
    this.materialsChanged.emit(this.materials());
  }

  /**
   * Generates a unique ID for new materials
   */
  private generateId(): string {
    return `material-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
