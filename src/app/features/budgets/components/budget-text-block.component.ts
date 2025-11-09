import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetTextBlock, DescriptionSection } from '../../../models/budget-text-block.model';

/**
 * Componente para mostrar y editar un bloque de texto del presupuesto
 * Incluye: encabezado, secciones de descripción, link opcional, foto opcional y total
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

  /**
   * Añade una nueva sección de descripción
   */
  protected addDescriptionSection(): void {
    const newSection: DescriptionSection = {
      id: this.generateId(),
      titulo: '',
      texto: ''
    };

    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      descripciones: [...this.block().descripciones, newSection]
    };

    this.blockUpdated.emit(updatedBlock);
  }

  /**
   * Actualiza una sección de descripción
   */
  protected updateDescriptionSection(sectionId: string, field: 'titulo' | 'texto', event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;

    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      descripciones: this.block().descripciones.map(desc =>
        desc.id === sectionId
          ? { ...desc, [field]: input.value }
          : desc
      )
    };

    this.blockUpdated.emit(updatedBlock);
  }

  /**
   * Elimina una sección de descripción
   */
  protected deleteDescriptionSection(sectionId: string): void {
    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      descripciones: this.block().descripciones.filter(desc => desc.id !== sectionId)
    };

    this.blockUpdated.emit(updatedBlock);
  }

  /**
   * Actualiza un campo del bloque
   */
  protected updateBlockField(field: keyof BudgetTextBlock, event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = field === 'total' ? parseFloat(input.value) || 0 : input.value;

    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      [field]: value
    };

    this.blockUpdated.emit(updatedBlock);
  }

  /**
   * Genera un ID único
   */
  private generateId(): string {
    return `desc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
