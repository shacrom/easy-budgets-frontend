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

  budgetId = input.required<string>();

  protected readonly countertop = signal<Countertop>({
    budgetId: '',
    model: '',
    description: '',
    price: 0
  });

  protected readonly isLoading = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);
  protected readonly isUploadingImage = signal<boolean>(false);
  protected readonly imageUploadError = signal<string | null>(null);

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

  private async loadCountertop(budgetId: string) {
    this.isLoading.set(true);
    try {
      const data = await this.supabase.getCountertopForBudget(budgetId);
      if (data) {
        this.countertop.set(data);
        this.totalChanged.emit(data.price || 0);
        this.countertopChanged.emit(data);
      } else {
        this.countertop.set({
          budgetId,
          model: '',
          description: '',
          price: 0
        });
      }
    } catch (error) {
      console.error('Error loading countertop:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async save() {
    const current = this.countertop();
    if (!current.budgetId) return;

    this.isSaving.set(true);
    try {
      const saved = await this.supabase.upsertCountertop(current);
      this.countertop.set(saved);
      this.totalChanged.emit(saved.price || 0);
      this.countertopChanged.emit(saved);
    } catch (error) {
      console.error('Error saving countertop:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  updateModel(value: string) {
    this.countertop.update(c => ({ ...c, model: value }));
  }

  updateDescription(value: string) {
    this.countertop.update(c => ({ ...c, description: value }));
  }

  updatePrice(value: number) {
    this.countertop.update(c => ({ ...c, price: value }));
    this.totalChanged.emit(value); // Emit immediately for UI update
  }

  setImageUrl(value: string) {
    if (!value) return;
    this.updateImageUrl(value);
    this.save();
  }

  updateImageUrl(value: string) {
    this.countertop.update(c => ({ ...c, imageUrl: value }));
  }

  clearImageUrl() {
    this.countertop.update(c => ({ ...c, imageUrl: null }));
    this.save();
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
      await this.save();
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
