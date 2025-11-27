import { ChangeDetectionStrategy, Component, signal, computed, output, inject, input, effect, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRowComponent } from './material-row.component';
import { Material, MaterialTable } from '../../../models/material.model';
import { Product } from '../../../models/product.model';
import { SupabaseService } from '../../../services/supabase.service';

/**
 * Container component for the materials table
 * Manages the complete list of budget materials
 */
@Component({
  selector: 'app-materials-table',
  templateUrl: './materials-table.component.html',
  styleUrls: ['./materials-table.component.css'],
  imports: [CommonModule, MaterialRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialsTableComponent {
  private readonly defaultTableTitle = 'Título';
  private readonly defaultSectionTitle = 'Materiales y equipamiento';
  private readonly supabase = inject(SupabaseService);

  // Section title (editable)
  readonly sectionTitleInput = input<string>(this.defaultSectionTitle, { alias: 'sectionTitle' });
  protected readonly sectionTitle = signal<string>(this.defaultSectionTitle);
  sectionTitleChanged = output<string>();

  // List of material tables
  protected readonly tables = signal<MaterialTable[]>([]);
  readonly tablesInput = input<MaterialTable[]>([], { alias: 'tables' });

  // Catalog products used for reference search
  protected readonly products = signal<Product[]>([]);
  protected readonly loadingProducts = signal<boolean>(false);

  // Track unsaved changes
  protected readonly hasUnsavedChanges = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Total calculated from all materials
  protected readonly totalMaterials = computed(() => {
    return this.tables().reduce((sum, table) => sum + this.calculateTableTotal(table), 0);
  });

  // Output: emits total when it changes
  totalChanged = output<number>();

  // Output: emits materials tables when they change
  tablesChanged = output<MaterialTable[]>();

  // Backward compatibility: flattened materials collection
  materialsChanged = output<Material[]>();

  // Track if initial sync from input has been done
  private initialSyncDone = false;
  private lastInputTablesSignature = '';

  // Reference to all material-row components
  @ViewChildren(MaterialRowComponent) materialRowComponents!: QueryList<MaterialRowComponent>;

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
  private getTablesSignature(tables: MaterialTable[]): string {
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
   * Adds a new empty material inside a table
   */
  protected addNewMaterial(tableId: number): void {
    this.mutateTables(tables =>
      tables.map(table =>
        table.id === tableId
          ? { ...table, rows: [...table.rows, this.createMaterial(table.id, table.rows.length)] }
          : table
      )
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Deletes a material by its ID
   */
  protected deleteMaterial(tableId: number, materialId: number): void {
    this.mutateTables(tables =>
      tables.map(table =>
        table.id === tableId
          ? { ...table, rows: table.rows.filter(material => material.id !== materialId) }
          : table
      )
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Called when a material-row component has local changes
   */
  protected onMaterialLocalChange(): void {
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Saves all changes and emits to parent
   */
  protected saveChanges(): void {
    this.isSaving.set(true);

    // Collect current values from all material-row components
    const updatedTables = this.tables().map(table => ({
      ...table,
      rows: table.rows.map(row => {
        // Find the corresponding MaterialRowComponent
        const rowComponent = this.materialRowComponents?.find(
          comp => comp.material().id === row.id
        );
        // Return the current material from the component if found, otherwise keep original
        return rowComponent ? rowComponent.getCurrentMaterial() : row;
      })
    }));

    // Update local state with collected values
    this.tables.set(updatedTables);

    // Emit all changes
    this.sectionTitleChanged.emit(this.sectionTitle());
    this.totalChanged.emit(this.totalMaterials());
    this.materialsChanged.emit(this.flattenMaterials(updatedTables));
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
  protected tableTotal(table: MaterialTable): number {
    return this.calculateTableTotal(table);
  }

  /**
   * Emits the current state
   */
  private emitChanges(options?: { skipTableOutput?: boolean }): void {
    this.totalChanged.emit(this.totalMaterials());
    const tablesSnapshot = this.tables();
    this.materialsChanged.emit(this.flattenMaterials(tablesSnapshot));

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

  private createTable(title: string, orderIndex: number): MaterialTable {
    const id = this.generateId();
    return {
      id,
      orderIndex,
      title,
      rows: []
    };
  }

  private createMaterial(tableId: number, orderIndex: number): Material {
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

  private calculateTableTotal(table: MaterialTable): number {
    return table.rows.reduce((sum, row) => sum + row.totalPrice, 0);
  }

  private flattenMaterials(tables: MaterialTable[]): Material[] {
    return tables.flatMap(table => table.rows);
  }

  private cloneTables(tables: MaterialTable[]): MaterialTable[] {
    return typeof structuredClone === 'function'
      ? structuredClone(tables)
      : JSON.parse(JSON.stringify(tables));
  }

  private normalizeTables(tables: MaterialTable[]): MaterialTable[] {
    return tables.map((table, tableIndex) => ({
      ...table,
      orderIndex: tableIndex,
      rows: (table.rows ?? []).map((row, rowIndex) => ({
        ...row,
        tableId: table.id,
        orderIndex: rowIndex
      }))
    }));
  }

  private prepareTables(tables: MaterialTable[]): MaterialTable[] {
    return this.normalizeTables(this.cloneTables(tables ?? []));
  }

  private mutateTables(
    mutator: (tables: MaterialTable[]) => MaterialTable[]
  ): void {
    this.tables.update(current => this.normalizeTables(mutator(this.cloneTables(current))));
    // No auto-emit - changes are only emitted when saveChanges() is called
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
}
