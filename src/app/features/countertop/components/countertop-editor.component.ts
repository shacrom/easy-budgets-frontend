import { ChangeDetectionStrategy, Component, signal, input, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';
import { Countertop } from '../../../models/countertop.model';

@Component({
  selector: 'app-countertop-editor',
  templateUrl: './countertop-editor.component.html',
  styleUrls: ['./countertop-editor.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CountertopEditorComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly defaultSectionTitle = 'Encimera';

  // budgetId may be null if not initialized; keep optional to avoid errors when no budget selected
  budgetId = input<number | null>(null);

  protected readonly sectionTitle = signal<string>(this.defaultSectionTitle);

  protected readonly countertop = signal<Countertop>({
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
  private originalCountertop = signal<Countertop>({
    budgetId: 0,
    model: '',
    description: '',
    price: 0
  });

  totalChanged = output<number>();
  countertopChanged = output<Countertop>();

  constructor() {
    effect(() => {
      const id = this.budgetId();
      if (id) {
        this.loadCountertop(id);
      }
    });
  }

  private async loadCountertop(budgetId: number) {
    this.isLoading.set(true);
    try {
      const data = await this.supabase.getCountertopForBudget(budgetId);
      if (data) {
        this.countertop.set(data);
        this.originalCountertop.set(data);

        // Load section title if exists
        if (data.sectionTitle) {
          this.sectionTitle.set(data.sectionTitle);
        } else {
          this.sectionTitle.set(this.defaultSectionTitle);
        }

        // Emit to parent immediately after loading to sync initial state
        this.countertopChanged.emit(data);
        this.totalChanged.emit(data.price || 0);
      } else {
        const emptyCountertop = {
          budgetId,
          model: '',
          description: '',
          price: 0
        };
        this.countertop.set(emptyCountertop);
        this.originalCountertop.set(emptyCountertop);
        this.sectionTitle.set(this.defaultSectionTitle);

        // Emit empty countertop to parent
        this.countertopChanged.emit(emptyCountertop);
        this.totalChanged.emit(0);
      }
      this.hasUnsavedChanges.set(false);
    } catch (error) {
      console.error('Error loading countertop:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveChanges() {
    const current = this.countertop();
    if (!current.budgetId) return;

    this.isSaving.set(true);
    try {
      const countertopWithSectionTitle = {
        ...current,
        sectionTitle: this.sectionTitle()
      };
      const saved = await this.supabase.upsertCountertop(countertopWithSectionTitle);
      this.countertop.set(saved);
      this.originalCountertop.set(saved);
      this.hasUnsavedChanges.set(false);

      // Emit after successful save
      this.totalChanged.emit(saved.price || 0);
      this.countertopChanged.emit(saved);
    } catch (error) {
      console.error('Error saving countertop:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  discardChanges() {
    const original = this.originalCountertop();
    this.countertop.set(original);
    this.sectionTitle.set(original.sectionTitle || this.defaultSectionTitle);
    this.hasUnsavedChanges.set(false);
  }

  protected updateSectionTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.sectionTitle.set(value);
    this.hasUnsavedChanges.set(true);
  }

  updateModel(value: string) {
    this.countertop.update(c => ({ ...c, model: value }));
    this.hasUnsavedChanges.set(true);
  }

  updateDescription(value: string) {
    this.countertop.update(c => ({ ...c, description: value }));
    this.hasUnsavedChanges.set(true);
  }

  updatePrice(value: number) {
    this.countertop.update(c => ({ ...c, price: value }));
    this.hasUnsavedChanges.set(true);
  }

  setImageUrl(value: string) {
    if (!value) return;
    this.updateImageUrl(value);
    this.hasUnsavedChanges.set(true);
  }

  updateImageUrl(value: string) {
    this.countertop.update(c => ({ ...c, imageUrl: value }));
    this.hasUnsavedChanges.set(true);
  }

  clearImageUrl() {
    this.countertop.update(c => ({ ...c, imageUrl: null }));
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
        folder: `countertops/${budgetId}`
      });

      this.countertop.update(c => ({ ...c, imageUrl: publicUrl }));
      this.hasUnsavedChanges.set(true);
    } catch (error) {
      console.error('Error uploading countertop image:', error);
      this.imageUploadError.set('No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      this.isUploadingImage.set(false);
      if (input) {
        input.value = '';
      }
    }
  }
}
