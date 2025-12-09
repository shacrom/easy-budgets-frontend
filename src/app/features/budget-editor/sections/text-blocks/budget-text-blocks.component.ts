import { ChangeDetectionStrategy, Component, signal, computed, output, input, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetTextBlockComponent } from './budget-text-block.component';
import { BudgetTextBlock } from '../../../../models/budget-text-block.model';
import { SupabaseService } from '../../../../services/supabase.service';

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
  private readonly defaultSectionTitle = 'Bloque Compuesto';

  // Input: Budget ID to load blocks for
  budgetId = input.required<number>();

  // Section title (editable)
  protected readonly sectionTitle = signal<string>(this.defaultSectionTitle);

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

  // Output: emits section title when it changes
  sectionTitleChanged = output<string>();

  // Manual save pattern
  protected readonly hasUnsavedChanges = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

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

      // Load section title from first block if exists
      if (blocks.length > 0 && blocks[0].sectionTitle) {
        this.sectionTitle.set(blocks[0].sectionTitle);
      } else {
        this.sectionTitle.set(this.defaultSectionTitle);
      }

      // Emit to parent immediately after loading to sync initial state
      this.blocksChanged.emit(blocks);
      this.totalChanged.emit(this.grandTotal());
      this.sectionTitleChanged.emit(this.sectionTitle());
    } catch (error) {
      console.error('Error loading text blocks:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Updates the section title
   */
  protected updateSectionTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.sectionTitle.set(value);
    this.sectionTitleChanged.emit(value);
    this.hasUnsavedChanges.set(true);
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
  async saveChanges(): Promise<void> {
    this.isSaving.set(true);

    try {
      // Save each block to the database
      const currentBlocks = this.blocks();
      const currentSectionTitle = this.sectionTitle();
      const currentBudgetId = this.budgetId();

      for (const block of currentBlocks) {
        if (block.id) {
          await this.supabase.updateBudgetTextBlock(block.id, {
            sectionTitle: currentSectionTitle,
            heading: block.heading,
            link: block.link,
            imageUrl: block.imageUrl,
            subtotal: block.subtotal,
            orderIndex: block.orderIndex
          });

          // Save descriptions (sections)
          if (block.descriptions) {
            for (const section of block.descriptions) {
              if (section.id) {
                await this.supabase.updateTextBlockSection(section.id, {
                  title: section.title,
                  text: section.text,
                  orderIndex: section.orderIndex
                });
              }
            }
          }
        }
      }

      // Reload blocks from database to ensure we have the latest data
      await this.loadBlocks(currentBudgetId);

      this.hasUnsavedChanges.set(false);
    } catch (error) {
      console.error('Error saving text blocks:', error);
    } finally {
      this.isSaving.set(false);
    }
  }
}
