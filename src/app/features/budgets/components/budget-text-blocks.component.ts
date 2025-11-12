import { ChangeDetectionStrategy, Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';

/**
 * Container component to manage all budget text blocks
 * Allows adding, editing, and deleting blocks
 */
@Component({
  selector: 'app-budget-text-blocks',
  templateUrl: './budget-text-blocks.component.html',
  styleUrls: ['./budget-text-blocks.component.css'],
  imports: [CommonModule, BudgetTextBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetTextBlocksComponent {
  // List of text blocks
  protected readonly blocks = signal<BudgetTextBlock[]>([]);

  // Edit mode
  protected readonly editMode = signal<boolean>(true);

  // Total calculated from all blocks
  protected readonly grandTotal = computed(() => {
    return this.blocks().reduce((sum, block) => sum + (typeof block.total === 'number' ? block.total : 0), 0);
  });

  // Output: emits total when it changes
  totalChanged = output<number>();

  // Output: emits blocks when they change
  blocksChanged = output<BudgetTextBlock[]>();

  /**
   * Adds a new empty block
   */
  protected addNewBlock(): void {
    const newBlock: BudgetTextBlock = {
      id: this.generateId(),
      heading: '',
      descriptions: [], // Initially without description sections
      link: '',
      photo: '',
      total: 0
    };

    this.blocks.update(blocks => [...blocks, newBlock]);
    this.emitTotal();
  }

  /**
   * Updates an existing block
   */
  protected updateBlock(updatedBlock: BudgetTextBlock): void {
    this.blocks.update(blocks =>
      blocks.map(block => block.id === updatedBlock.id ? updatedBlock : block)
    );
    this.emitTotal();
  }

  /**
   * Deletes a block by its ID
   */
  protected deleteBlock(blockId: string): void {
    this.blocks.update(blocks => blocks.filter(block => block.id !== blockId));
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
    this.totalChanged.emit(this.grandTotal());
    this.blocksChanged.emit(this.blocks());
  }

  /**
   * Generates a unique ID for new blocks
   */
  private generateId(): string {
    return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
