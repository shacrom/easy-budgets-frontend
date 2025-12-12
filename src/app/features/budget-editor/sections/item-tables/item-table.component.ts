import { ChangeDetectionStrategy, Component, signal, computed, output, inject, input, effect, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ItemRowComponent } from './item-row.component';
import { ItemRow, ItemTable } from '../../../../models/item-table.model';
import { Product, CreateProductDto } from '../../../../models/product.model';
import { SupabaseService } from '../../../../services/supabase.service';
import { ProductFormDialogComponent, ProductFormDialogResult } from '../../../products/components/product-form-dialog.component';

/**
 * Container component for the item tables section
 * Manages the complete list of budget item tables
 */
@Component({
  selector: 'app-item-table',
  templateUrl: './item-table.component.html',
  styleUrls: ['./item-table.component.css'],
  imports: [CommonModule, ItemRowComponent, CdkDropList, CdkDrag, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ItemTableComponent {
  private readonly defaultTableTitle = 'Título';
  private readonly defaultSectionTitle = 'Partidas y equipamiento';
  private readonly supabase = inject(SupabaseService);
  private readonly dialog = inject(MatDialog);

  // Section title (editable)
  readonly sectionTitleInput = input<string>(this.defaultSectionTitle, { alias: 'sectionTitle' });
  protected readonly sectionTitle = signal<string>(this.defaultSectionTitle);
  sectionTitleChanged = output<string>();

  // List of item tables
  protected readonly tables = signal<ItemTable[]>([]);
  readonly tablesInput = input<ItemTable[]>([], { alias: 'tables' });

  // Catalog products used for reference search
  protected readonly products = signal<Product[]>([]);
  protected readonly loadingProducts = signal<boolean>(false);

  // Track unsaved changes
  protected readonly hasUnsavedChanges = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Selection mode for supplier orders
  protected readonly selectionModeActive = signal<boolean>(false);
  protected readonly selectedRowIds = signal<Set<number>>(new Set());

  // Computed: number of selected rows
  protected readonly selectedCount = computed(() => this.selectedRowIds().size);

  // Computed: check if all rows are selected
  protected readonly allRowsSelected = computed(() => {
    const allRows = this.tables().flatMap(t => t.rows);
    if (allRows.length === 0) return false;
    return allRows.every(row => this.selectedRowIds().has(row.id));
  });

  // Computed: get selected rows with their data
  protected readonly selectedRows = computed(() => {
    const selected = this.selectedRowIds();
    return this.tables()
      .flatMap(t => t.rows)
      .filter(row => selected.has(row.id));
  });

  // Total calculated from all items
  protected readonly totalItems = computed(() => {
    return this.tables().reduce((sum, table) => sum + this.calculateTableTotal(table), 0);
  });

  // Output: emits total when it changes
  totalChanged = output<number>();

  // Output: emits item tables when they change
  tablesChanged = output<ItemTable[]>();

  // Output: emits when user wants to create a supplier order with selected rows
  createOrderRequested = output<ItemRow[]>();

  // Backward compatibility: flattened items collection
  rowsChanged = output<ItemRow[]>();

  // Track if initial sync from input has been done
  private initialSyncDone = false;
  private lastInputTablesSignature = '';

  // Reference to all item-row components
  @ViewChildren(ItemRowComponent) itemRowComponents!: QueryList<ItemRowComponent>;

  constructor() {
    // Sync section title from input
    effect(() => {
      const title = this.sectionTitleInput();
      if (title) {
        this.sectionTitle.set(title);
      }
    });

    // Only sync from input on initial load or when table structure changes (not content)
    effect(() => {
      const incomingTables = this.tablesInput() ?? [];
      const signature = this.getTablesSignature(incomingTables);

      // Skip if signature hasn't changed (same tables, just content updates)
      if (this.initialSyncDone && signature === this.lastInputTablesSignature) {
        return;
      }

      this.lastInputTablesSignature = signature;
      this.tables.set(this.prepareTables(incomingTables));
      this.initialSyncDone = true;
      this.emitChanges({ skipTableOutput: true });
    });

    this.emitChanges({ skipTableOutput: true });
    void this.loadProducts();
  }

  /**
   * Creates a signature based on table/row IDs to detect structural changes
   */
  private getTablesSignature(tables: ItemTable[]): string {
    return tables.map(t => `${t.id}:[${t.rows.map(r => r.id).join(',')}]`).join('|');
  }

  /**
   * Updates the section title
   */
  protected updateSectionTitle(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.sectionTitle.set(value);
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Adds a new table
   */
  protected addTable(): void {
    this.mutateTables(tables => [...tables, this.createTable(this.defaultTableTitle, tables.length)]);
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Removes a table or clears it when it is the last one
   */
  protected deleteTable(tableId: number): void {
    this.mutateTables(tables => tables.filter(table => table.id !== tableId));
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Updates a table title
   */
  protected updateTableTitle(tableId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const currentTables = this.tables();
    const tableIndex = currentTables.findIndex(t => t.id === tableId);
    if (tableIndex === -1) return;

    // Update in place
    currentTables[tableIndex].title = value;

    // Trigger signal update
    this.tables.set([...currentTables]);
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Adds a new empty row inside a table
   */
  protected addNewRow(tableId: number): void {
    this.mutateTables(tables =>
      tables.map(table =>
        table.id === tableId
          ? { ...table, rows: [...table.rows, this.createRow(table.id, table.rows.length)] }
          : table
      )
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Deletes a row by its ID
   */
  protected deleteRow(tableId: number, rowId: number): void {
    this.mutateTables(tables =>
      tables.map(table =>
        table.id === tableId
          ? { ...table, rows: table.rows.filter(row => row.id !== rowId) }
          : table
      )
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Called when an item-row component has local changes
   */
  protected onRowLocalChange(): void {
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Handles drag & drop reordering of rows within a table
   */
  protected drop(event: CdkDragDrop<ItemRow[]>, tableId: number): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.mutateTables(tables =>
      tables.map(table => {
        if (table.id !== tableId) return table;

        const reorderedRows = [...table.rows];
        moveItemInArray(reorderedRows, event.previousIndex, event.currentIndex);

        return {
          ...table,
          rows: reorderedRows
        };
      })
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Saves all changes and emits to parent
   */
  protected saveChanges(): void {
    this.isSaving.set(true);

    // Collect current values from all item-row components
    const updatedTables = this.tables().map(table => ({
      ...table,
      rows: table.rows.map(row => {
        // Find the corresponding ItemRowComponent
        const rowComponent = this.itemRowComponents?.find(
          comp => comp.row().id === row.id
        );
        // Return the current row from the component if found, otherwise keep original
        return rowComponent ? rowComponent.getCurrentRow() : row;
      })
    }));

    // Update local state with collected values
    this.tables.set(updatedTables);

    // Emit all changes
    this.sectionTitleChanged.emit(this.sectionTitle());
    this.totalChanged.emit(this.totalItems());
    this.rowsChanged.emit(this.flattenRows(updatedTables));
    this.tablesChanged.emit(updatedTables);

    // Mark as saved
    this.hasUnsavedChanges.set(false);

    // Simulate async save (remove timeout if actual async operation)
    setTimeout(() => {
      this.isSaving.set(false);
    }, 300);
  }

  /**
   * Discards all unsaved changes
   */
  protected discardChanges(): void {
    // Reset to last saved state from input
    const incomingTables = this.tablesInput() ?? [];
    this.tables.set(this.prepareTables(incomingTables));
    this.sectionTitle.set(this.sectionTitleInput() || this.defaultSectionTitle);
    this.hasUnsavedChanges.set(false);
  }

  /**
   * Calculates a table total
   */
  protected tableTotal(table: ItemTable): number {
    return this.calculateTableTotal(table);
  }

  protected getVisibleColumnCount(table: ItemTable): number {
    let count = 0;
    if (table.showReference) count++;
    if (table.showDescription) count++;
    if (table.showManufacturer) count++;
    if (table.showQuantity) count++;
    if (table.showUnitPrice) count++;
    if (table.showTotalPrice) count++;
    // Actions column is always visible
    return count + 1;
  }

  /**
   * Emits the current state
   */
  private emitChanges(options?: { skipTableOutput?: boolean }): void {
    this.totalChanged.emit(this.totalItems());
    const tablesSnapshot = this.tables();
    this.rowsChanged.emit(this.flattenRows(tablesSnapshot));

    if (!options?.skipTableOutput) {
      this.tablesChanged.emit(tablesSnapshot);
    }
  }

  /**
   * Generates a unique ID
   */
  private tempIdCounter = -1;
  private generateId(): number {
    // Use negative numbers for client-generated temporary IDs. The server will supply positive autoincremented IDs.
    return this.tempIdCounter--;
  }

  private createTable(title: string, orderIndex: number): ItemTable {
    const id = this.generateId();
    return {
      id,
      orderIndex,
      title,
      rows: [],
      showReference: true,
      showDescription: true,
      showManufacturer: true,
      showQuantity: true,
      showUnitPrice: true,
      showTotalPrice: true
    };
  }

  private createRow(tableId: number, orderIndex: number): ItemRow {
    const id = this.generateId();
    return {
      id,
      tableId,
      orderIndex,
      description: '',
      reference: '',
      manufacturer: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0
    };
  }

  private calculateTableTotal(table: ItemTable): number {
    return table.rows.reduce((sum, row) => sum + row.totalPrice, 0);
  }

  /**
   * Toggles the show flag of a given column in a table
   */
  protected toggleShowColumn(tableId: number, field: keyof Omit<ItemTable, 'id' | 'budgetId' | 'orderIndex' | 'title' | 'rows'>): void {
    this.mutateTables(tables =>
      tables.map(table => {
        if (table.id !== tableId) return table;

        return {
          ...table,
          [field]: !(table as any)[field]
        } as ItemTable;
      })
    );
    this.hasUnsavedChanges.set(true);
  }

  private flattenRows(tables: ItemTable[]): ItemRow[] {
    return tables.flatMap(table => table.rows);
  }

  private cloneTables(tables: ItemTable[]): ItemTable[] {
    return typeof structuredClone === 'function'
      ? structuredClone(tables)
      : JSON.parse(JSON.stringify(tables));
  }

  private normalizeTables(tables: ItemTable[]): ItemTable[] {
    return tables.map((table, tableIndex) => ({
      ...table,
      orderIndex: tableIndex,
      rows: (table.rows ?? []).map((row, rowIndex) => ({
        ...row,
        tableId: table.id,
        orderIndex: rowIndex
      }))
      ,
      // Ensure visibility flags default to true when absent
      showReference: table.showReference ?? true,
      showDescription: table.showDescription ?? true,
      showManufacturer: table.showManufacturer ?? true,
      showQuantity: table.showQuantity ?? true,
      showUnitPrice: table.showUnitPrice ?? true,
      showTotalPrice: table.showTotalPrice ?? true
    }));
  }

  private prepareTables(tables: ItemTable[]): ItemTable[] {
    return this.normalizeTables(this.cloneTables(tables ?? []));
  }

  private mutateTables(
    mutator: (tables: ItemTable[]) => ItemTable[]
  ): void {
    this.tables.update(current => this.normalizeTables(mutator(this.cloneTables(current))));
    // No auto-emit - changes are only emitted when saveChanges() is called
  }

  /**
   * Opens the product creation dialog with prefilled data from a row
   * After successful creation, applies the product to the requesting row
   */
  protected openCreateProductDialog(prefillData: Partial<CreateProductDto>, rowId: number): void {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '600px',
      data: { prefillData },
      panelClass: 'product-form-dialog'
    });

    dialogRef.afterClosed().subscribe((result: ProductFormDialogResult | undefined) => {
      if (result?.created && result.product) {
        // Add the new product to the local catalog
        this.products.update(products => [...products, result.product!]);

        // Find and apply the product to the row that requested creation
        const rowComponent = this.itemRowComponents?.find(
          comp => comp.row().id === rowId
        );

        if (rowComponent) {
          rowComponent.applyProduct(result.product);
          this.hasUnsavedChanges.set(true);
        }
      }
    });
  }

  private async loadProducts(): Promise<void> {
    this.loadingProducts.set(true);
    try {
      const catalog = await this.supabase.getProducts();
      this.products.set(catalog);
    } catch (error) {
      console.error('No se pudo cargar el catálogo de productos', error);
    } finally {
      this.loadingProducts.set(false);
    }
  }

  // ============================================
  // SELECTION MODE FOR SUPPLIER ORDERS
  // ============================================

  /**
   * Toggles selection mode on/off
   */
  protected toggleSelectionMode(): void {
    const isActive = !this.selectionModeActive();
    this.selectionModeActive.set(isActive);
    if (!isActive) {
      // Clear selection when exiting selection mode
      this.selectedRowIds.set(new Set());
    }
  }

  /**
   * Handles row selection change from item-row component
   */
  protected onRowSelectionChange(event: { rowId: number; selected: boolean }): void {
    this.selectedRowIds.update(current => {
      const newSet = new Set(current);
      if (event.selected) {
        newSet.add(event.rowId);
      } else {
        newSet.delete(event.rowId);
      }
      return newSet;
    });
  }

  /**
   * Selects or deselects all rows in all tables
   */
  protected toggleSelectAll(): void {
    const allRows = this.tables().flatMap(t => t.rows);
    const currentSelected = this.selectedRowIds();

    if (currentSelected.size === allRows.length) {
      // All selected, deselect all
      this.selectedRowIds.set(new Set());
    } else {
      // Select all
      this.selectedRowIds.set(new Set(allRows.map(r => r.id)));
    }
  }

  /**
   * Checks if a specific row is selected
   */
  protected isRowSelected(rowId: number): boolean {
    return this.selectedRowIds().has(rowId);
  }

  /**
   * Emits selected rows to create a supplier order
   */
  protected requestCreateOrder(): void {
    const selected = this.selectedRows();
    if (selected.length > 0) {
      this.createOrderRequested.emit(selected);
    }
  }

  /**
   * Cancels selection mode and clears selection
   */
  protected cancelSelection(): void {
    this.selectionModeActive.set(false);
    this.selectedRowIds.set(new Set());
  }
}
