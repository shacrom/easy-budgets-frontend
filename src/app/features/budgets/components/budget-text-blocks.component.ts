import { ChangeDetectionStrategy, Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';

/**
 * Componente contenedor para gestionar todos los bloques de texto del presupuesto
 * Permite añadir, editar y eliminar bloques
 */
@Component({
  selector: 'app-budget-text-blocks',
  templateUrl: './budget-text-blocks.component.html',
  styleUrls: ['./budget-text-blocks.component.css'],
  imports: [CommonModule, BudgetTextBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetTextBlocksComponent {
  // Lista de bloques de texto
  protected readonly blocks = signal<BudgetTextBlock[]>([]);

  // Modo de edición
  protected readonly editMode = signal<boolean>(true);

  // Total calculado de todos los bloques
  protected readonly totalGeneral = computed(() => {
    return this.blocks().reduce((sum, block) => sum + (typeof block.total === 'number' ? block.total : 0), 0);
  });

  // Output: emite el total cuando cambia
  totalChanged = output<number>();

  // Output: emite los bloques cuando cambian
  blocksChanged = output<BudgetTextBlock[]>();

  /**
   * Añade un nuevo bloque vacío
   */
  protected addNewBlock(): void {
    const newBlock: BudgetTextBlock = {
      id: this.generateId(),
      encabezado: '',
      descripciones: [], // Inicialmente sin secciones de descripción
      link: '',
      foto: '',
      total: 0
    };

    this.blocks.update(blocks => [...blocks, newBlock]);
    this.emitTotal();
  }

  /**
   * Actualiza un bloque existente
   */
  protected updateBlock(updatedBlock: BudgetTextBlock): void {
    this.blocks.update(blocks =>
      blocks.map(block => block.id === updatedBlock.id ? updatedBlock : block)
    );
    this.emitTotal();
  }

  /**
   * Elimina un bloque por su ID
   */
  protected deleteBlock(blockId: string): void {
    this.blocks.update(blocks => blocks.filter(block => block.id !== blockId));
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
    this.totalChanged.emit(this.totalGeneral());
    this.blocksChanged.emit(this.blocks());
  }

  /**
   * Genera un ID único para nuevos bloques
   */
  private generateId(): string {
    return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
