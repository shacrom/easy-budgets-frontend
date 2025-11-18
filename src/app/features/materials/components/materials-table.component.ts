import { ChangeDetectionStrategy, Component, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialRowComponent } from './material-row.component';
import { Material, MaterialTable } from '../../../models/material.model';

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
  private readonly initialTableTitle = 'Materiales';

  // List of material tables
  protected readonly tables = signal<MaterialTable[]>([this.createTable(this.initialTableTitle)]);

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

  constructor() {
    this.emitChanges();
  }

  /**
   * Adds a new table
   */
  protected addTable(): void {
    const nextIndex = this.tables().length + 1;
    const newTitle = nextIndex === 2 ? 'Electrodomésticos' : nextIndex === 3 ? 'Iluminación' : `Tabla ${nextIndex}`;

    this.tables.update(tables => [...tables, this.createTable(newTitle)]);
    this.emitChanges();
  }

  /**
   * Removes a table or clears it when it is the last one
   */
  protected deleteTable(tableId: string): void {
    if (this.tables().length === 1) {
      this.tables.update(tables =>
        tables.map(table => table.id === tableId ? { ...table, rows: [] } : table)
      );
    } else {
      this.tables.update(tables => tables.filter(table => table.id !== tableId));
    }
    this.emitChanges();
  }

  /**
   * Updates a table title
   */
  protected updateTableTitle(tableId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.tables.update(tables =>
      tables.map(table => table.id === tableId ? { ...table, title: value } : table)
    );
    this.emitChanges(false);
  }

  /**
   * Adds a new empty material inside a table
   */
  protected addNewMaterial(tableId: string): void {
    this.tables.update(tables =>
      tables.map(table =>
        table.id === tableId
          ? { ...table, rows: [...table.rows, this.createMaterial()] }
          : table
      )
    );
    this.emitChanges();
  }

  /**
   * Updates an existing material
   */
  protected updateMaterial(tableId: string, updatedMaterial: Material): void {
    this.tables.update(tables =>
      tables.map(table =>
        table.id === tableId
          ? {
              ...table,
              rows: table.rows.map(material =>
                material.id === updatedMaterial.id ? updatedMaterial : material
              )
            }
          : table
      )
    );
    this.emitChanges();
  }

  /**
   * Deletes a material by its ID
   */
  protected deleteMaterial(tableId: string, materialId: string): void {
    this.tables.update(tables =>
      tables.map(table =>
        table.id === tableId
          ? { ...table, rows: table.rows.filter(material => material.id !== materialId) }
          : table
      )
    );
    this.emitChanges();
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
  private emitChanges(emitTotal = true): void {
    if (emitTotal) {
      this.totalChanged.emit(this.totalMaterials());
    }
    const tablesSnapshot = this.tables();
    this.tablesChanged.emit(tablesSnapshot);
    this.materialsChanged.emit(this.flattenMaterials(tablesSnapshot));
  }

  /**
   * Generates a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private createTable(title: string): MaterialTable {
    return {
      id: this.generateId('table'),
      title,
      rows: []
    };
  }

  private createMaterial(): Material {
    return {
      id: this.generateId('material'),
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
}
