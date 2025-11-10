import { ChangeDetectionStrategy, Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRowComponent } from './material-row.component';
import { Material } from '../../../models/material.model';

/**
 * Componente contenedor para la tabla de materiales
 * Gestiona la lista completa de materiales del presupuesto
 */
@Component({
  selector: 'app-materials-table',
  templateUrl: './materials-table.component.html',
  styleUrls: ['./materials-table.component.css'],
  imports: [CommonModule, MaterialRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialsTableComponent {
  // Lista de materiales
  protected readonly materials = signal<Material[]>([]);

  // Modo de edición
  protected readonly editMode = signal<boolean>(true);

  // Total calculado de todos los materiales
  protected readonly totalMateriales = computed(() => {
    return this.materials().reduce((sum, material) => sum + material.precioTotal, 0);
  });

  // Output: emite el total cuando cambia
  totalChanged = output<number>();

  /**
   * Añade un nuevo material vacío
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
   * Actualiza un material existente
   */
  protected updateMaterial(updatedMaterial: Material): void {
    this.materials.update(materials =>
      materials.map(material => material.id === updatedMaterial.id ? updatedMaterial : material)
    );
    this.emitTotal();
  }

  /**
   * Elimina un material por su ID
   */
  protected deleteMaterial(materialId: string): void {
    this.materials.update(materials => materials.filter(material => material.id !== materialId));
    this.emitTotal();
  }

  /**
   * Alterna el modo de edición
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }

  /**
   * Emite el total actual
   */
  private emitTotal(): void {
    this.totalChanged.emit(this.totalMateriales());
  }

  /**
   * Genera un ID único para nuevos materiales
   */
  private generateId(): string {
    return `material-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
