import { ChangeDetectionStrategy, Component, signal, computed, output, input, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { SupabaseService } from '../../../services/supabase.service';

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
  private readonly supabase = inject(SupabaseService);

  // Input: Budget ID to load blocks for
  budgetId = input.required<number>();

  // List of text blocks
  protected readonly blocks = signal<BudgetTextBlock[]>([]);

  // Loading state
  protected readonly isLoading = signal<boolean>(false);

  // Creating state
  protected readonly isCreating = signal<boolean>(false);

  // Total calculated from all blocks
  protected readonly grandTotal = computed(() => {
    return this.blocks().reduce((sum, block) => sum + (block.subtotal || 0), 0);
  });

  // Output: emits total when it changes (only on manual save)
  totalChanged = output<number>();

  // Output: emits blocks when they change (only on manual save)
  blocksChanged = output<BudgetTextBlock[]>();

  // Manual save pattern
  protected readonly hasUnsavedChanges = signal<boolean>(false);

  constructor() {
    // Load blocks when budgetId changes
    effect(() => {
      const id = this.budgetId();
      if (id) {
        this.loadBlocks(id);
      }
    });

    // No automatic effects - removed all auto-emit logic
  }

  /**
   * Load blocks from Supabase for the current budget
   */
  private async loadBlocks(budgetId: number): Promise<void> {
    this.isLoading.set(true);
    try {
      const blocks = await this.supabase.getTextBlocksForBudget(budgetId);
      this.blocks.set(blocks);

      // Emit to parent immediately after loading to sync initial state
      this.blocksChanged.emit(blocks);
      this.totalChanged.emit(this.grandTotal());
    } catch (error) {
      console.error('Error loading text blocks:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Adds a new empty block
   */
  protected async addNewBlock(): Promise<void> {
    const budgetId = this.budgetId();
    if (!Number.isFinite(budgetId)) {
      console.error('Invalid budgetId, aborted add block');
      return;
    }
    if (!budgetId) {
      console.error('No budgetId available to create a text block.');
      return;
    }

    const nextOrderIndex = this.blocks().length;

    if (this.isCreating()) {
      return;
    }

    this.isCreating.set(true);
    try {
      await this.supabase.addTextBlockToBudget({
        budgetId,
        orderIndex: nextOrderIndex,
        heading: '',
        link: '',
        imageUrl: '',
        subtotal: 0
      });

      await this.loadBlocks(budgetId);
    } catch (error) {
      console.error('Error adding text block:', error);
    } finally {
      this.isCreating.set(false);
    }
  }

  /**
   * Updates an existing block
   */
  protected updateBlock(updatedBlock: BudgetTextBlock): void {
    this.blocks.update(blocks =>
      blocks.map(block => block.id === updatedBlock.id ? updatedBlock : block)
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Deletes a block by its ID
   */
  protected deleteBlock(blockId: number): void {
    this.blocks.update(blocks => blocks.filter(block => block.id !== blockId));
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Saves changes and emits to parent
   */
  saveChanges(): void {
    // Emit current state
    this.totalChanged.emit(this.grandTotal());
    this.blocksChanged.emit(this.blocks());
    this.hasUnsavedChanges.set(false);
  }
}
