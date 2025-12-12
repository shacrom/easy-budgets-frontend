import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ItemRow } from '../../../models/item-table.model';
import { Supplier } from '../../../models/supplier.model';
import { SupabaseService } from '../../../services/supabase.service';

/**
 * Data passed to the dialog
 */
export interface SupplierSelectionDialogData {
  selectedRows: ItemRow[];
  budgetId?: number;
  customerReference?: string;
}

/**
 * Result returned when dialog closes
 */
export interface SupplierSelectionDialogResult {
  created: boolean;
  orderIds?: number[];
}

/**
 * Interface for grouped items by supplier
 */
interface SupplierGroup {
  supplierName: string;
  supplierId?: number;
  items: ItemRow[];
  selected: boolean;
  itemCount: number;
}

/**
 * Dialog component for selecting suppliers when creating orders from selected items.
 * Groups items by supplier and allows user to select which orders to create.
 */
@Component({
  selector: 'app-supplier-selection-dialog',
  imports: [FormsModule, MatDialogModule, SlicePipe],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>Crear Pedidos a Proveedores</h3>
        <button type="button" class="close-button" (click)="cancel()">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div class="dialog-content">
        @if (errorMessage()) {
          <div class="alert error">{{ errorMessage() }}</div>
        }

        @if (isLoading()) {
          <div class="loading-state">
            <span class="material-symbols-rounded spinning">sync</span>
            <p>Cargando proveedores...</p>
          </div>
        } @else {
          <p class="info-text">
            Has seleccionado <strong>{{ totalItems() }}</strong> elementos de
            <strong>{{ supplierGroups().length }}</strong> proveedor(es) diferente(s).
          </p>
          <p class="info-text secondary">
            Selecciona los proveedores para los que deseas crear pedidos:
          </p>

          <div class="supplier-list">
            @for (group of supplierGroups(); track group.supplierName) {
              <label class="supplier-item" [class.selected]="group.selected">
                <input
                  type="checkbox"
                  [checked]="group.selected"
                  (change)="toggleSupplierSelection(group.supplierName, $event)">
                <div class="supplier-info">
                  <span class="supplier-name">{{ group.supplierName || 'Sin proveedor' }}</span>
                  <span class="item-count">{{ group.itemCount }} elemento(s)</span>
                </div>
                <div class="supplier-items-preview">
                  @for (item of group.items.slice(0, 3); track item.id) {
                    <span class="item-preview">{{ item.reference || item.description | slice:0:30 }}</span>
                  }
                  @if (group.items.length > 3) {
                    <span class="more-items">+{{ group.items.length - 3 }} más</span>
                  }
                </div>
              </label>
            }
          </div>

          @if (supplierGroups().length > 1) {
            <div class="selection-actions">
              <button type="button" class="btn link" (click)="selectAll()">Seleccionar todos</button>
              <button type="button" class="btn link" (click)="deselectAll()">Deseleccionar todos</button>
            </div>
          }
        }
      </div>

      <div class="dialog-footer">
        <button type="button" class="btn ghost" (click)="cancel()">Cancelar</button>
        <button
          type="button"
          class="btn solid accent"
          [disabled]="isCreating() || selectedGroupCount() === 0"
          (click)="createOrders()">
          @if (isCreating()) {
            <span class="material-symbols-rounded spinning">sync</span>
            <span>Creando...</span>
          } @else {
            <span class="material-symbols-rounded">local_shipping</span>
            <span>Crear {{ selectedGroupCount() }} Pedido(s)</span>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      min-width: 500px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .close-button:hover {
      background-color: #f3f4f6;
      color: #111827;
    }

    .dialog-content {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .info-text {
      margin: 0 0 0.5rem;
      font-size: 0.9rem;
      color: #374151;
    }

    .info-text.secondary {
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .supplier-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .supplier-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .supplier-item:hover {
      border-color: #d1d5db;
      background-color: #f9fafb;
    }

    .supplier-item.selected {
      border-color: #b45309;
      background-color: #fffbeb;
    }

    .supplier-item input[type="checkbox"] {
      width: 1.1rem;
      height: 1.1rem;
      margin-top: 0.15rem;
      accent-color: #b45309;
      cursor: pointer;
    }

    .supplier-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 120px;
    }

    .supplier-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .item-count {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .supplier-items-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      flex: 1;
    }

    .item-preview {
      font-size: 0.75rem;
      color: #6b7280;
      background-color: #f3f4f6;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
    }

    .more-items {
      font-size: 0.75rem;
      color: #9ca3af;
      font-style: italic;
    }

    .selection-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background-color: #f9fafb;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn.ghost {
      background: transparent;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .btn.ghost:hover {
      background-color: #f3f4f6;
    }

    .btn.solid {
      background-color: #111827;
      border: 1px solid #111827;
      color: white;
    }

    .btn.solid:hover {
      background-color: #000;
    }

    .btn.accent {
      background-color: #b45309;
      border-color: #b45309;
    }

    .btn.accent:hover {
      background-color: #92400e;
      border-color: #92400e;
    }

    .btn.link {
      background: transparent;
      border: none;
      color: #b45309;
      padding: 0.25rem 0.5rem;
      text-transform: none;
      letter-spacing: normal;
    }

    .btn.link:hover {
      text-decoration: underline;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .alert.error {
      padding: 0.75rem 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      border-radius: 4px;
      margin-bottom: 1rem;
      font-size: 0.85rem;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem;
      color: #6b7280;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierSelectionDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<SupplierSelectionDialogComponent>);
  private readonly data = inject<SupplierSelectionDialogData>(MAT_DIALOG_DATA);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly supplierGroupsState = signal<SupplierGroup[]>([]);

  protected readonly supplierGroups = computed(() => this.supplierGroupsState());
  protected readonly totalItems = computed(() => this.data.selectedRows.length);
  protected readonly selectedGroupCount = computed(() =>
    this.supplierGroupsState().filter(g => g.selected).length
  );

  ngOnInit(): void {
    void this.loadAndGroupItems();
  }

  private async loadAndGroupItems(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Load suppliers
      const suppliers = await this.supabase.getSuppliers();
      this.suppliers.set(suppliers);

      // Group items by supplier
      const groups = this.groupItemsBySupplier(this.data.selectedRows, suppliers);
      this.supplierGroupsState.set(groups);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      this.errorMessage.set('Error al cargar los proveedores');
    } finally {
      this.isLoading.set(false);
    }
  }

  private groupItemsBySupplier(items: ItemRow[], suppliers: Supplier[]): SupplierGroup[] {
    const groupMap = new Map<string, SupplierGroup>();

    for (const item of items) {
      // Use supplierId to find supplier, or fallback to 'Sin proveedor'
      const matchingSupplier = item.supplierId ? suppliers.find(s => s.id === item.supplierId) : null;
      const supplierKey = matchingSupplier ? matchingSupplier.name : 'Sin proveedor';

      if (!groupMap.has(supplierKey)) {
        groupMap.set(supplierKey, {
          supplierName: supplierKey,
          supplierId: matchingSupplier?.id,
          items: [],
          selected: true, // Select by default
          itemCount: 0
        });
      }

      const group = groupMap.get(supplierKey)!;
      group.items.push(item);
      group.itemCount = group.items.length;
    }

    // Sort groups: known suppliers first, then by name
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.supplierId && !b.supplierId) return -1;
      if (!a.supplierId && b.supplierId) return 1;
      return a.supplierName.localeCompare(b.supplierName);
    });
  }

  protected toggleSupplierSelection(supplierName: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.supplierGroupsState.update(groups =>
      groups.map(g =>
        g.supplierName === supplierName ? { ...g, selected: checked } : g
      )
    );
  }

  protected selectAll(): void {
    this.supplierGroupsState.update(groups =>
      groups.map(g => ({ ...g, selected: true }))
    );
  }

  protected deselectAll(): void {
    this.supplierGroupsState.update(groups =>
      groups.map(g => ({ ...g, selected: false }))
    );
  }

  protected async createOrders(): Promise<void> {
    const selectedGroups = this.supplierGroupsState().filter(g => g.selected);
    if (selectedGroups.length === 0) return;

    this.isCreating.set(true);
    this.errorMessage.set(null);

    const createdOrderIds: number[] = [];

    try {
      for (const group of selectedGroups) {
        // Generate order number
        const orderNumber = await this.supabase.generateSupplierOrderNumber();

        // If supplier doesn't exist, create it
        let supplierId = group.supplierId;
        if (!supplierId && group.supplierName !== 'Sin proveedor') {
          const newSupplier = await this.supabase.createSupplier({
            name: group.supplierName
          });
          supplierId = newSupplier.id;
        }

        // Create the order
        const order = await this.supabase.createSupplierOrder({
          budgetId: this.data.budgetId ?? null,
          supplierId: supplierId ?? null,
          orderNumber,
          status: 'draft',
          customerReference: this.data.customerReference ?? null
        }, group.items.map((item, index) => ({
          itemTableRowId: item.id,
          productId: item.productId ?? null,
          reference: item.reference ?? null,
          description: item.description,
          supplierId: item.supplierId ?? null,
          quantity: item.quantity,
          orderIndex: index
        })));

        createdOrderIds.push(order.id);
      }

      // Close dialog with success
      this.dialogRef.close({
        created: true,
        orderIds: createdOrderIds
      } as SupplierSelectionDialogResult);

      // Navigate to orders list or first order
      if (createdOrderIds.length === 1) {
        void this.router.navigate(['/pedidos-proveedor', createdOrderIds[0]]);
      } else {
        void this.router.navigate(['/pedidos-proveedor']);
      }
    } catch (error) {
      console.error('Error creating orders:', error);
      this.errorMessage.set('Error al crear los pedidos. Por favor, inténtalo de nuevo.');
    } finally {
      this.isCreating.set(false);
    }
  }

  protected cancel(): void {
    this.dialogRef.close({ created: false } as SupplierSelectionDialogResult);
  }
}
