import { ChangeDetectionStrategy, Component, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetTextBlock, DescriptionSection } from '../../../models/budget-text-block.model';
import { SupabaseService } from '../../../services/supabase.service';
import { TEXT_BLOCK_TEMPLATES, TextBlockTemplate } from '../templates/text-block-templates';

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

  // Local state for editing
  protected readonly isEditing = signal(false);

  // Local state for sections (writable version)
  protected readonly sections = signal<DescriptionSection[]>([]);

  protected readonly templateOptions = signal<TextBlockTemplate[]>(TEXT_BLOCK_TEMPLATES);
  protected readonly selectedTemplateId = signal<string | null>(null);
  protected readonly isApplyingTemplate = signal<boolean>(false);
  protected readonly isUploadingImage = signal<boolean>(false);
  protected readonly imageUploadError = signal<string | null>(null);

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

      // Emit update event to notify parent component
      const updatedBlock: BudgetTextBlock = {
        ...this.block(),
        descriptions: [...currentSections, newSection]
      };
      this.blockUpdated.emit(updatedBlock);
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
      const updatedSections = this.sections().filter(s => s.id !== sectionId);
      this.sections.set(updatedSections);

      // Emit update event to notify parent component
      const updatedBlock: BudgetTextBlock = {
        ...this.block(),
        descriptions: updatedSections
      };
      this.blockUpdated.emit(updatedBlock);
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

    this.emitBlockPatch({ [field]: value } as Partial<BudgetTextBlock>);
  }

  private emitBlockPatch(patch: Partial<BudgetTextBlock>): void {
    const updatedBlock: BudgetTextBlock = {
      ...this.block(),
      descriptions: this.sections(),
      ...patch
    };

    this.blockUpdated.emit(updatedBlock);
  }

  protected onTemplateChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value || null;
    this.selectedTemplateId.set(value);
  }

  protected async applySelectedTemplate(): Promise<void> {
    const templateId = this.selectedTemplateId();
    const blockId = this.block().id;

    if (!templateId || !blockId) {
      return;
    }

    const template = this.templateOptions().find(t => t.id === templateId);
    if (!template) {
      return;
    }

    const confirmed = confirm('Aplicar una plantilla reemplazará las secciones actuales. ¿Deseas continuar?');
    if (!confirmed) {
      return;
    }

    this.isApplyingTemplate.set(true);

    try {
      // Delete existing sections
      const existingSections = this.sections();
      await Promise.all(
        existingSections
          .filter(section => !!section.id)
          .map(section => this.supabase.deleteTextBlockSection(section.id as string))
      );

      // Create sections from template sequentially to preserve order
      const createdSections: DescriptionSection[] = [];
      for (let index = 0; index < template.sections.length; index += 1) {
        const sectionTemplate = template.sections[index];
        const createdSection = await this.supabase.addSectionToTextBlock({
          textBlockId: blockId,
          orderIndex: index,
          title: sectionTemplate.title,
          text: sectionTemplate.text
        });
        createdSections.push(createdSection);
      }

      this.sections.set(createdSections);

      const updatedBlock: BudgetTextBlock = {
        ...this.block(),
        descriptions: createdSections,
        heading: template.heading ?? this.block().heading
      };

      this.blockUpdated.emit(updatedBlock);

      this.selectedTemplateId.set(null);
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      this.isApplyingTemplate.set(false);
    }
  }

  protected async onBlockImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const block = this.block();
    if (!block?.id || !block?.budgetId) {
      this.imageUploadError.set('No se encontró el bloque para asociar la imagen.');
      input.value = '';
      return;
    }

    this.imageUploadError.set(null);
    this.isUploadingImage.set(true);

    try {
      const { publicUrl } = await this.supabase.uploadPublicAsset(file, {
        folder: `text-blocks/${block.budgetId}`
      });

      const updatedBlock: BudgetTextBlock = {
        ...block,
        imageUrl: publicUrl,
        descriptions: this.sections()
      };

      await this.supabase.updateBudgetTextBlock(block.id, {
        heading: updatedBlock.heading,
        link: updatedBlock.link,
        imageUrl: updatedBlock.imageUrl,
        orderIndex: updatedBlock.orderIndex,
        subtotal: updatedBlock.subtotal
      });

      this.blockUpdated.emit(updatedBlock);
    } catch (error) {
      console.error('Error uploading block image:', error);
      this.imageUploadError.set('No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      this.isUploadingImage.set(false);
      if (input) {
        input.value = '';
      }
    }
  }

  /**
   * Calculates the number of rows for a textarea based on content
   * Minimum 3 rows, or number of line breaks + 1
   */
  protected calculateRows(text: string | undefined | null): number {
    if (!text) {
      return 3;
    }
    const lineBreaks = (text.match(/\n/g) || []).length;
    return Math.max(3, lineBreaks + 1);
  }
}
