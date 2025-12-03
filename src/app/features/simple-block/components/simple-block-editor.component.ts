import { ChangeDetectionStrategy, Component, signal, input, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';
import { SimpleBlock } from '../../../models/simple-block.model';

@Component({
  selector: 'app-simple-block-editor',
  templateUrl: './simple-block-editor.component.html',
  styleUrls: ['./simple-block-editor.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleBlockEditorComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly defaultSectionTitle = 'Bloque Simple';

  // budgetId may be null if not initialized; keep optional to avoid errors when no budget selected
  budgetId = input<number | null>(null);

  protected readonly sectionTitle = signal<string>(this.defaultSectionTitle);

  protected readonly simpleBlock = signal<SimpleBlock>({
    budgetId: 0,
    model: '',
    description: '',
    price: 0
  });

  protected readonly isLoading = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly isUploadingImage = signal<boolean>(false);
  protected readonly imageUploadError = signal<string | null>(null);
  protected readonly hasUnsavedChanges = signal<boolean>(false);

  // Store original loaded state for discard
  private originalSimpleBlock = signal<SimpleBlock>({
    budgetId: 0,
    model: '',
    description: '',
    price: 0
  });

  totalChanged = output<number>();
  simpleBlockChanged = output<SimpleBlock>();

  constructor() {
    effect(() => {
      const id = this.budgetId();
      if (id) {
        this.loadSimpleBlock(id);
      }
    });
  }

  private async loadSimpleBlock(budgetId: number) {
    this.isLoading.set(true);
    try {
      const data = await this.supabase.getSimpleBlockForBudget(budgetId);
      if (data) {
        this.simpleBlock.set(data);
        this.originalSimpleBlock.set(data);

        // Load section title if exists
        if (data.sectionTitle) {
          this.sectionTitle.set(data.sectionTitle);
        } else {
          this.sectionTitle.set(this.defaultSectionTitle);
        }

        // Emit to parent immediately after loading to sync initial state
        this.simpleBlockChanged.emit(data);
        this.totalChanged.emit(data.price || 0);
      } else {
        const emptySimpleBlock = {
          budgetId,
          model: '',
          description: '',
          price: 0
        };
        this.simpleBlock.set(emptySimpleBlock);
        this.originalSimpleBlock.set(emptySimpleBlock);
        this.sectionTitle.set(this.defaultSectionTitle);

        // Emit empty simpleBlock to parent
        this.simpleBlockChanged.emit(emptySimpleBlock);
        this.totalChanged.emit(0);
      }
      this.hasUnsavedChanges.set(false);
    } catch (error) {
      console.error('Error loading simple block:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveChanges() {
    const current = this.simpleBlock();
    if (!current.budgetId) return;

    this.isSaving.set(true);
    try {
      const simpleBlockWithSectionTitle = {
        ...current,
        sectionTitle: this.sectionTitle()
      };
      const saved = await this.supabase.upsertSimpleBlock(simpleBlockWithSectionTitle);
      this.simpleBlock.set(saved);
      this.originalSimpleBlock.set(saved);
      this.hasUnsavedChanges.set(false);

      // Emit after successful save
      this.totalChanged.emit(saved.price || 0);
      this.simpleBlockChanged.emit(saved);
    } catch (error) {
      console.error('Error saving simple block:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  discardChanges() {
    const original = this.originalSimpleBlock();
    this.simpleBlock.set(original);
    this.sectionTitle.set(original.sectionTitle || this.defaultSectionTitle);
    this.hasUnsavedChanges.set(false);
  }

  protected updateSectionTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.sectionTitle.set(value);
    this.hasUnsavedChanges.set(true);
  }

  updateModel(value: string) {
    this.simpleBlock.update(c => ({ ...c, model: value }));
    this.hasUnsavedChanges.set(true);
  }

  updateDescription(value: string) {
    this.simpleBlock.update(c => ({ ...c, description: value }));
    this.hasUnsavedChanges.set(true);
  }

  updatePrice(value: number) {
    this.simpleBlock.update(c => ({ ...c, price: value }));
    this.hasUnsavedChanges.set(true);
  }

  setImageUrl(value: string) {
    if (!value) return;
    this.updateImageUrl(value);
    this.hasUnsavedChanges.set(true);
  }

  updateImageUrl(value: string) {
    this.simpleBlock.update(c => ({ ...c, imageUrl: value }));
    this.hasUnsavedChanges.set(true);
  }

  clearImageUrl() {
    this.simpleBlock.update(c => ({ ...c, imageUrl: null }));
    this.hasUnsavedChanges.set(true);
  }

  protected async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const budgetId = this.budgetId();
    if (!budgetId) {
      this.imageUploadError.set('No hay un presupuesto activo para asociar la imagen.');
      input.value = '';
      return;
    }

    this.imageUploadError.set(null);
    this.isUploadingImage.set(true);

    try {
      const { publicUrl } = await this.supabase.uploadPublicAsset(file, {
        folder: `simple-blocks/${budgetId}`
      });

      this.simpleBlock.update(c => ({ ...c, imageUrl: publicUrl }));
      this.hasUnsavedChanges.set(true);
    } catch (error) {
      console.error('Error uploading simple block image:', error);
      this.imageUploadError.set('No se pudo subir la imagen. Inténtalo de nuevo más tarde.');
    } finally {
      this.isUploadingImage.set(false);
      if (input) {
        input.value = '';
      }
    }
  }
}
