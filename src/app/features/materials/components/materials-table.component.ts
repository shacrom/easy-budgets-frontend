import { ChangeDetectionStrategy, Component, signal, computed, output, inject, input, effect } from '@angular/core';
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

  // Edit mode
  protected readonly editMode = signal<boolean>(true);

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
    this.sectionTitleChanged.emit(value);
  }

  /**
   * Adds a new table
   */
  protected addTable(): void {
    this.mutateTables(tables => [...tables, this.createTable(this.defaultTableTitle, tables.length)]);
  }

  /**
   * Removes a table or clears it when it is the last one
   */
  protected deleteTable(tableId: number): void {
    this.mutateTables(tables => tables.filter(table => table.id !== tableId));
  }

  /**
   * Updates a table title without causing re-render
   */
  protected updateTableTitle(tableId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const currentTables = this.tables();
    const tableIndex = currentTables.findIndex(t => t.id === tableId);
    if (tableIndex === -1) return;

    // Update in place
    currentTables[tableIndex].title = value;

    // Trigger signal update but skip parent output to prevent loop
    this.tables.set([...currentTables]);

    // Emit to parent outputs but skip tablesChanged to prevent loop
    this.totalChanged.emit(this.totalMaterials());
    this.materialsChanged.emit(this.flattenMaterials(currentTables));
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
  }

  /**
   * Updates an existing material without causing re-render
   */
  protected updateMaterial(tableId: number, updatedMaterial: Material): void {
    const currentTables = this.tables();
    const tableIndex = currentTables.findIndex(t => t.id === tableId);
    if (tableIndex === -1) return;

    const table = currentTables[tableIndex];
    const rowIndex = table.rows.findIndex(r => r.id === updatedMaterial.id);
    if (rowIndex === -1) return;

    // Update in place
    table.rows[rowIndex] = { ...updatedMaterial, tableId: table.id, orderIndex: rowIndex };

    // Trigger signal update but skip parent output to prevent loop
    this.tables.set([...currentTables]);

    // Emit to parent outputs but skip tablesChanged to prevent loop
    this.totalChanged.emit(this.totalMaterials());
    this.materialsChanged.emit(this.flattenMaterials(currentTables));
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
  }

  /**
   * Toggles edit mode
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
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
    mutator: (tables: MaterialTable[]) => MaterialTable[],
    options?: { skipTableOutput?: boolean }
  ): void {
    this.tables.update(current => this.normalizeTables(mutator(this.cloneTables(current))));
    this.emitChanges(options);
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
