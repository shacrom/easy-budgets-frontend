import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetTextBlock, DescriptionSection } from '../../../models/budget-text-block.model';

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
  // Input: text block data
  block = input.required<BudgetTextBlock>();

  // Input: edit mode
  editMode = input<boolean>(false);

  // Output: event when block is updated
  blockUpdated = output<BudgetTextBlock>();

  // Output: event when block is deleted
  blockDeleted = output<string>();

  // Local state for editing
  protected readonly isEditing = signal(false);

  /**
   * Activates edit mode
   */
  protected startEdit(): void {
    this.isEditing.set(true);
  }

  /**
   * Saves changes and emits update event
   */
  protected saveChanges(): void {
    this.blockUpdated.emit(this.block());
    this.isEditing.set(false);
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
  protected deleteBlock(): void {
    this.blockDeleted.emit(this.block().id);
  }

  /**
   * Adds a new description section
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
   * Updates a description section
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
   * Deletes a description section
   */
  protected deleteDescriptionSection(sectionId: string): void {
    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      descripciones: this.block().descripciones.filter(desc => desc.id !== sectionId)
    };

    this.blockUpdated.emit(updatedBlock);
  }

  /**
   * Updates a block field
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
   * Generates a unique ID
   */
  private generateId(): string {
    return `desc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
