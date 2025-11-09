import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';

/**
 * Componente para mostrar y editar un bloque de texto del presupuesto
 * Incluye: encabezado, texto, link opcional, foto opcional y total
 */
@Component({
  selector: 'app-budget-text-block',
  templateUrl: './budget-text-block.component.html',
  styleUrls: ['./budget-text-block.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetTextBlockComponent {
  // Input: datos del bloque de texto
  block = input.required<BudgetTextBlock>();

  // Input: modo de edición
  editMode = input<boolean>(false);

  // Output: evento cuando se actualiza el bloque
  blockUpdated = output<BudgetTextBlock>();

  // Output: evento cuando se elimina el bloque
  blockDeleted = output<string>();

  // Estado local para edición
  protected readonly isEditing = signal(false);

  /**
   * Activa el modo de edición
   */
  protected startEdit(): void {
    this.isEditing.set(true);
  }

  /**
   * Guarda los cambios y emite el evento de actualización
   */
  protected saveChanges(): void {
    this.blockUpdated.emit(this.block());
    this.isEditing.set(false);
  }

  /**
   * Cancela la edición
   */
  protected cancelEdit(): void {
    this.isEditing.set(false);
  }

  /**
   * Elimina el bloque y emite el evento
   */
  protected deleteBlock(): void {
    this.blockDeleted.emit(this.block().id);
  }
}
