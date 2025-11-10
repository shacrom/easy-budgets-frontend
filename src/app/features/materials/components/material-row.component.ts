import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Material } from '../../../models/material.model';

/**
 * Componente para mostrar y editar una fila de material en la tabla
 */
@Component({
  selector: 'app-material-row',
  templateUrl: './material-row.component.html',
  styleUrls: ['./material-row.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialRowComponent {
  // Input: datos del material
  material = input.required<Material>();

  // Input: modo de edición
  editMode = input<boolean>(false);

  // Output: evento cuando se actualiza el material
  materialUpdated = output<Material>();

  // Output: evento cuando se elimina el material
  materialDeleted = output<string>();

  // Precio total calculado
  protected readonly precioTotal = computed(() => {
    const mat = this.material();
    return mat.cantidad * mat.precioUnitario;
  });

  /**
   * Actualiza el precio total cuando cambian cantidad o precio unitario
   */
  protected onValueChange(): void {
    const updatedMaterial: Material = {
      ...this.material(),
      precioTotal: this.material().cantidad * this.material().precioUnitario
    };
    this.materialUpdated.emit(updatedMaterial);
  }

  /**
   * Elimina el material
   */
  protected deleteMaterial(): void {
    this.materialDeleted.emit(this.material().id);
  }
}
