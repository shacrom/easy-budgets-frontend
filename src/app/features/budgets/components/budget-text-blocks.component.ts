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
  budgetId = input.required<string>();

  // List of text blocks
  protected readonly blocks = signal<BudgetTextBlock[]>([]);

  // Loading state
  protected readonly isLoading = signal<boolean>(false);

  // Edit mode
  protected readonly editMode = signal<boolean>(true);

  // Total calculated from all blocks
  protected readonly grandTotal = computed(() => {
    return this.blocks().reduce((sum, block) => sum + (block.subtotal || 0), 0);
  });

  // Output: emits total when it changes
  totalChanged = output<number>();

  // Output: emits blocks when they change
  blocksChanged = output<BudgetTextBlock[]>();

  constructor() {
    // Load blocks when budgetId changes
    effect(() => {
      const id = this.budgetId();
      if (id) {
        this.loadBlocks(id);
      }
    });

    // Emit total and blocks when they change
    effect(() => {
      this.totalChanged.emit(this.grandTotal());
      this.blocksChanged.emit(this.blocks());
    });
  }

  /**
   * Load blocks from Supabase for the current budget
   */
  private async loadBlocks(budgetId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const blocks = await this.supabase.getTextBlocksForBudget(budgetId);
      this.blocks.set(blocks);
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
    const currentBlocks = this.blocks();
    const nextOrderIndex = currentBlocks.length;

    try {
      const newBlock = await this.supabase.addTextBlockToBudget({
        budgetId: this.budgetId(),
        orderIndex: nextOrderIndex,
        heading: '',
        link: '',
        imageUrl: '',
        subtotal: 0
      });

      this.blocks.update(blocks => [...blocks, newBlock]);
    } catch (error) {
      console.error('Error adding text block:', error);
    }
  }

  /**
   * Updates an existing block
   */
  protected updateBlock(updatedBlock: BudgetTextBlock): void {
    this.blocks.update(blocks =>
      blocks.map(block => block.id === updatedBlock.id ? updatedBlock : block)
    );
  }

  /**
   * Deletes a block by its ID
   */
  protected deleteBlock(blockId: string): void {
    this.blocks.update(blocks => blocks.filter(block => block.id !== blockId));
  }

  /**
   * Refresh blocks from database (called when sections are modified)
   */
  protected async refreshBlocks(): Promise<void> {
    await this.loadBlocks(this.budgetId());
  }

  /**
   * Toggles edit mode
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }
}
