import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Product, CreateProductDto } from '../../../models/product.model';
import { Supplier } from '../../../models/supplier.model';
import { SupabaseService } from '../../../services/supabase.service';

/**
 * Dialog data for pre-filling product form
 */
export interface ProductFormDialogData {
  prefillData?: Partial<CreateProductDto> | Product;
  isEditing?: boolean;
  productId?: number;
}

/**
 * Dialog result returned when product is created
 */
export interface ProductFormDialogResult {
  created: boolean;
  product?: Product;
}

/**
 * Reusable dialog component for creating products
 * Can be opened from anywhere in the app with optional pre-filled data
 */
@Component({
  selector: 'app-product-form-dialog',
  template: `
    <div class="dialog-container">
      <div class="form-header">
        <h3>{{ isEditMode() ? 'Editar producto' : 'Nuevo producto' }}</h3>
        <button type="button" class="close-button" (click)="cancel()">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      @if (errorMessage()) {
        <div class="alert error">{{ errorMessage() }}</div>
      }

      <div class="form-grid">
        <label class="form-field">
          <span>Referencia *</span>
          <input
            type="text"
            [value]="formData().reference"
            (input)="updateField('reference', $event)">
        </label>
        <label class="form-field">
          <span>Proveedor</span>
          <select
            [value]="formData().supplierId ?? ''"
            (change)="updateSupplierField($event)">
            <option value="">Sin proveedor</option>
            @for (supplier of suppliers(); track supplier.id) {
              <option [value]="supplier.id">{{ supplier.name }}</option>
            }
          </select>
        </label>
        <label class="form-field full">
          <span>Descripción *</span>
          <input
            type="text"
            [value]="formData().description"
            (input)="updateField('description', $event)">
        </label>
        <label class="form-field">
          <span>Precio Base (€) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            [value]="formData().basePrice"
            (input)="updateField('basePrice', $event)">
        </label>
        <label class="form-field">
          <span>Precio total (PVP)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            [value]="grossPrice()"
            (input)="updateGrossPrice($event)"
            placeholder="Introduce el precio con IVA">
        </label>
        <label class="form-field">
          <span>IVA (%) *</span>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            [value]="formData().vatRate"
            (input)="updateField('vatRate', $event)">
        </label>
        <label class="form-field">
          <span>Categoría</span>
          <input
            type="text"
            [value]="formData().category || ''"
            (input)="updateField('category', $event)">
        </label>
        <label class="form-field checkbox full">
          <span>Estado</span>
          <div class="checkbox-control">
            <input
              id="product-active-dialog"
              type="checkbox"
              [checked]="formData().active ?? true"
              (change)="updateField('active', $event)">
            <label for="product-active-dialog">Producto activo</label>
          </div>
        </label>
      </div>

      <div class="form-actions">
        <button
          type="button"
          class="btn dark"
          [disabled]="isLoading()"
          (click)="submitProduct()">
          {{ isLoading() ? (isEditMode() ? 'Guardando...' : 'Creando...') : (isEditMode() ? 'Guardar cambios' : 'Crear producto') }}
        </button>
        <button type="button" class="btn ghost" (click)="cancel()">Cancelar</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      background: #fff;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 500px;
      max-width: 600px;
    }

    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .form-header h3 {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      color: #374151;
      font-weight: 300;
      margin: 0;
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      color: #6b7280;
      transition: color 0.2s ease;
    }

    .close-button:hover {
      color: #111827;
    }

    .alert {
      padding: 0.85rem 1rem;
      border-left: 4px solid currentColor;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.75rem;
      font-weight: 300;
    }

    .alert.error {
      background: #fef2f2;
      color: #991b1b;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .dialog-container {
        min-width: auto;
        width: 100%;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .form-field span {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
    }

    .form-field.full {
      grid-column: span 2;
    }

    @media (max-width: 640px) {
      .form-field.full {
        grid-column: span 1;
      }
    }

    .form-field input {
      border: 1px solid #d1d5db;
      border-radius: 0;
      padding: 0.8rem 1rem;
      font-size: 0.9rem;
      font-weight: 300;
      background: #fff;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .form-field select {
      border: 1px solid #d1d5db;
      border-radius: 0;
      padding: 0.8rem 1rem;
      font-size: 0.9rem;
      font-weight: 300;
      background: #fff;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }

    .form-field input:focus,
    .form-field select:focus {
      outline: none;
      border-color: #111827;
      box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.1);
    }

    .checkbox-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-control input {
      width: 1.1rem;
      height: 1.1rem;
    }

    .checkbox-control label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #374151;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      border: 1px solid #111827;
      background: transparent;
      color: #111827;
      padding: 0.75rem 1.75rem;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      font-weight: 300;
      border-radius: 0;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .btn.dark {
      background: #111827;
      color: #fff;
    }

    .btn.dark:not(:disabled):hover {
      background: #000;
    }

    .btn.ghost:not(:disabled):hover {
      background: #111827;
      color: #fff;
    }
  `],
  imports: [FormsModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ProductFormDialogComponent>);
  private readonly data = inject<ProductFormDialogData>(MAT_DIALOG_DATA);
  private readonly supabaseService = inject(SupabaseService);

  // Edit mode detection
  protected readonly isEditMode = signal(this.data?.isEditing ?? false);
  protected readonly productId = signal(this.data?.productId);

  // Form state
  protected readonly formData = signal<CreateProductDto>(this.initializeFormData());
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  // Suppliers list
  protected readonly suppliers = signal<Supplier[]>([]);

  // Track last gross price for VAT calculations
  private lastGrossPrice: number | null = null;

  // Computed gross price (base price + VAT)
  protected readonly grossPrice = computed(() => {
    const data = this.formData();
    return this.calculateGrossPrice(data.basePrice, data.vatRate);
  });

  ngOnInit(): void {
    this.loadSuppliers();
  }

  private async loadSuppliers(): Promise<void> {
    try {
      const suppliers = await this.supabaseService.getSuppliers();
      this.suppliers.set(suppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }

  /**
   * Update supplier field from select
   */
  protected updateSupplierField(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const supplierId = value ? Number(value) : null;
    this.formData.update(data => ({ ...data, supplierId }));
  }

  /**
   * Initialize form data with prefilled values or defaults
   */
  private initializeFormData(): CreateProductDto {
    const prefill = this.data?.prefillData ?? {};
    return {
      reference: prefill.reference ?? '',
      description: prefill.description ?? '',
      basePrice: prefill.basePrice ?? 0,
      vatRate: prefill.vatRate ?? 21, // Default VAT 21%
      category: prefill.category ?? '',
      supplierId: prefill.supplierId ?? null,
      active: prefill.active ?? true
    };
  }

  /**
   * Update a form field
   */
  protected updateField(field: keyof CreateProductDto, event: Event): void {
    const input = event.target as HTMLInputElement;

    if (field === 'basePrice' || field === 'vatRate') {
      const numValue = this.parseNumber(input.value);
      // Reset gross price tracking when base price changes
      if (field === 'basePrice') {
        this.lastGrossPrice = null;
        this.formData.update(data => ({ ...data, basePrice: numValue }));
        return;
      }
      // Recalculate base price if gross price was set
      if (field === 'vatRate' && this.lastGrossPrice !== null) {
        const basePrice = this.calculateBasePriceFromGross(this.lastGrossPrice, numValue);
        this.formData.update(data => ({ ...data, vatRate: numValue, basePrice }));
        return;
      }
      this.formData.update(data => ({ ...data, vatRate: numValue }));
      return;
    }

    if (field === 'active') {
      this.formData.update(data => ({ ...data, active: input.checked }));
      return;
    }

    // String fields
    this.formData.update(data => ({ ...data, [field]: input.value }));
  }

  /**
   * Update gross price and recalculate base price
   */
  protected updateGrossPrice(event: Event): void {
    const input = event.target as HTMLInputElement;
    const grossPrice = this.parseNumber(input.value);
    this.lastGrossPrice = grossPrice;

    const currentVatRate = this.formData().vatRate;
    const basePrice = this.calculateBasePriceFromGross(grossPrice, currentVatRate);

    this.formData.update(data => ({ ...data, basePrice }));
  }

  /**
   * Submit the product (create or update)
   */
  protected async submitProduct(): Promise<void> {
    const product = this.formData();

    // Validations
    if (!product.reference?.trim()) {
      this.errorMessage.set('La referencia es obligatoria');
      return;
    }

    if (!product.description?.trim()) {
      this.errorMessage.set('La descripción es obligatoria');
      return;
    }

    if (product.basePrice <= 0) {
      this.errorMessage.set('El precio debe ser mayor que 0');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      let resultProduct: Product;

      if (this.isEditMode() && this.productId()) {
        // Update existing product
        resultProduct = await this.supabaseService.updateProduct(this.productId()!, product);
      } else {
        // Create new product
        resultProduct = await this.supabaseService.createProduct(product);
      }

      this.dialogRef.close({
        created: true,
        product: resultProduct
      } as ProductFormDialogResult);
    } catch (error) {
      console.error('Error saving product:', error);
      const action = this.isEditMode() ? 'actualizar' : 'crear';
      this.errorMessage.set(`Error al ${action} el producto. Por favor, inténtalo de nuevo.`);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Cancel and close dialog
   */
  protected cancel(): void {
    this.dialogRef.close({ created: false } as ProductFormDialogResult);
  }

  /**
   * Parse a string to number safely
   */
  private parseNumber(value: string): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Calculate gross price from base price and VAT rate
   */
  private calculateGrossPrice(basePrice: number, vatRate: number): number {
    return Math.round(basePrice * (1 + vatRate / 100) * 100) / 100;
  }

  /**
   * Calculate base price from gross price and VAT rate
   */
  private calculateBasePriceFromGross(grossPrice: number, vatRate: number): number {
    return Math.round((grossPrice / (1 + vatRate / 100)) * 100) / 100;
  }
}
