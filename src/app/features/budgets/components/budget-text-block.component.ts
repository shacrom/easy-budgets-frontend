import { ChangeDetectionStrategy, Component, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetTextBlock, DescriptionSection } from '../../../models/budget-text-block.model';
import { SupabaseService } from '../../../services/supabase.service';

/**
 * Component to display and edit a budget text block
 * Includes: heading, description sections, optional link, optional photo and total
 */
@Component({
  selector: 'app-budget-text-block',
  templateUrl: './budget-text-block.component.html',
  styleUrls: ['./budget-text-block.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetTextBlockComponent {
  private readonly supabase = inject(SupabaseService);

  // Input: text block data
  block = input.required<BudgetTextBlock>();

  // Input: edit mode
  editMode = input<boolean>(false);

  // Output: event when block is updated
  blockUpdated = output<BudgetTextBlock>();

  // Output: event when block is deleted
  blockDeleted = output<string>();

  // Output: event when a section is added (to refresh from DB)
  sectionAdded = output<void>();

  // Local state for editing
  protected readonly isEditing = signal(false);

  // Local state for sections (writable version)
  protected readonly sections = signal<DescriptionSection[]>([]);

  // Sync sections when block changes
  constructor() {
    effect(() => {
      const currentBlock = this.block();
      if (currentBlock.descriptions) {
        this.sections.set([...currentBlock.descriptions]);
      }
    });
  }

  /**
   * Activates edit mode
   */
  protected startEdit(): void {
    this.isEditing.set(true);
  }

  /**
   * Saves changes and emits update event
   */
  protected async saveChanges(): Promise<void> {
    const blockId = this.block().id;
    if (!blockId) return;

    try {
      await this.supabase.updateBudgetTextBlock(blockId, {
        heading: this.block().heading,
        link: this.block().link,
        imageUrl: this.block().imageUrl,
        subtotal: this.block().subtotal,
        orderIndex: this.block().orderIndex
      });
      
      this.isEditing.set(false);
      this.blockUpdated.emit(this.block());
    } catch (error) {
      console.error('Error saving block:', error);
    }
  }

  /**
   * Cancels editing
   */
  protected cancelEdit(): void {
    this.isEditing.set(false);
  }

  /**
   * Deletes the block and emits event
   */
  protected async deleteBlock(): Promise<void> {
    const blockId = this.block().id;
    if (!blockId) return;

    if (!confirm('¿Estás seguro de eliminar este bloque? Se eliminarán también todas sus secciones.')) {
      return;
    }

    try {
      await this.supabase.deleteBudgetTextBlock(blockId);
      this.blockDeleted.emit(blockId);
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  }

  /**
   * Adds a new description section
   */
  protected async addDescriptionSection(): Promise<void> {
    const blockId = this.block().id;
    if (!blockId) return;

    const currentSections = this.sections();
    const nextOrderIndex = currentSections.length;

    try {
      const newSection = await this.supabase.addSectionToTextBlock({
        textBlockId: blockId,
        orderIndex: nextOrderIndex,
        title: '',
        text: ''
      });

      // Add to local state immediately for better UX
      this.sections.update(sections => [...sections, newSection]);
      this.sectionAdded.emit(); // Notify parent to refresh
    } catch (error) {
      console.error('Error adding section:', error);
    }
  }

  /**
   * Updates a description section
   */
  protected async updateDescriptionSection(sectionId: string | undefined, field: 'title' | 'text', event: Event): Promise<void> {
    if (!sectionId) return;

    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = input.value;

    try {
      // Update locally first for immediate feedback
      this.sections.update(sections => 
        sections.map(section =>
          section.id === sectionId
            ? { ...section, [field]: value }
            : section
        )
      );

      // Then update in database
      const section = this.sections().find(s => s.id === sectionId);
      if (section) {
        await this.supabase.updateTextBlockSection(sectionId, {
          title: section.title,
          text: section.text,
          orderIndex: section.orderIndex
        });
      }
    } catch (error) {
      console.error('Error updating section:', error);
    }
  }

  /**
   * Deletes a description section
   */
  protected async deleteDescriptionSection(sectionId: string | undefined): Promise<void> {
    if (!sectionId) return;

    if (!confirm('¿Estás seguro de eliminar esta sección?')) {
      return;
    }

    try {
      await this.supabase.deleteTextBlockSection(sectionId);
      
      // Remove from local state
      this.sections.update(sections => sections.filter(s => s.id !== sectionId));
      this.sectionAdded.emit(); // Notify parent to refresh
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  }

  /**
   * Updates a block field
   */
  protected updateBlockField(field: keyof BudgetTextBlock, event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = field === 'subtotal' ? parseFloat(input.value) || 0 : input.value;

    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      [field]: value
    };

    this.blockUpdated.emit(updatedBlock);
  }
}
