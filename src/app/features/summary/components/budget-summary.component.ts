import { ChangeDetectionStrategy, Component, input, signal, computed, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetSummary, SummaryLine } from '../../../models/budget-summary.model';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { Material, MaterialTable } from '../../../models/material.model';

/**
 * Component to display the budget summary
 * Shows totals for blocks, materials, VAT and grand total
 */
@Component({
  selector: 'app-budget-summary',
  templateUrl: './budget-summary.component.html',
  styleUrls: ['./budget-summary.component.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetSummaryComponent {
  // Inputs: totals from each section
  totalBlocks = input<number>(0);
  totalMaterials = input<number>(0);
  totalCountertop = input<number>(0);

  // Inputs: data arrays to show details
  blocks = input<BudgetTextBlock[]>([]);
  materials = input<Material[]>([]);
  materialTables = input<MaterialTable[]>([]);

  // Local state for configuration
  protected readonly vatPercentage = signal<number>(21);
  protected readonly editMode = signal<boolean>(false);
  protected readonly additionalLines = signal<SummaryLine[]>([]);

  readonly summaryChanged = output<BudgetSummary>();
  readonly vatPercentageChanged = output<number>();
  readonly additionalLinesChanged = output<SummaryLine[]>();

  constructor() {
    effect(() => {
      this.summaryChanged.emit({
        totalBlocks: this.totalBlocks(),
        totalMaterials: this.totalMaterials(),
        totalCountertop: this.totalCountertop(),
        subtotal: this.subtotal(),
        vat: this.vat(),
        vatPercentage: this.vatPercentage(),
        grandTotal: this.grandTotal(),
        additionalLines: this.additionalLines()
      });
    });

    effect(() => {
      this.vatPercentageChanged.emit(this.vatPercentage());
    });

    effect(() => {
      this.additionalLinesChanged.emit(this.additionalLines());
    });
  }

  // Dropdown states (expanded by default)
  protected readonly blocksExpanded = signal<boolean>(true);
  protected readonly materialsExpanded = signal<boolean>(true);
  protected readonly hasMaterialTables = computed(() => this.materialTables().length > 0);

  // Computed values
  protected readonly subtotal = computed(() => {
    const blocks = this.totalBlocks();
    const materials = this.totalMaterials();
    const countertop = this.totalCountertop();
    const additional = this.additionalLines().reduce((sum, line) => sum + line.amount, 0);
    return blocks + materials + countertop + additional;
  });

  protected readonly totalAdditionalLines = computed(() => {
    return this.additionalLines().reduce((sum, line) => sum + line.amount, 0);
  });

  protected readonly taxableBase = computed(() => {
    return this.subtotal() + this.totalAdditionalLines();
  });

  protected readonly vat = computed(() => {
    return this.taxableBase() * (this.vatPercentage() / 100);
  });

  protected readonly grandTotal = computed(() => {
    return this.taxableBase() + this.vat();
  });

  /**
   * Toggles edit mode
   */
  protected toggleEditMode(): void {
    this.editMode.update(mode => !mode);
  }

  /**
   * Toggles blocks dropdown
   */
  protected toggleBlocksExpanded(): void {
    this.blocksExpanded.update(expanded => !expanded);
  }

  /**
   * Toggles materials dropdown
   */
  protected toggleMaterialsExpanded(): void {
    this.materialsExpanded.update(expanded => !expanded);
  }

  /**
   * Adds a new additional line (discount, extra, etc.)
   */
  protected addAdditionalLine(): void {
    const newLine: SummaryLine = {
      id: this.generateId(),
      concept: '',
      amount: 0
    };

    this.additionalLines.update(lines => [...lines, newLine]);
  }

  /**
   * Updates an additional line
   */
  protected updateAdditionalLine(updatedLine: SummaryLine): void {
    this.additionalLines.update(lines =>
      lines.map(line => line.id === updatedLine.id ? updatedLine : line)
    );
  }

  /**
   * Deletes an additional line
   */
  protected deleteAdditionalLine(lineId: string): void {
    this.additionalLines.update(lines => lines.filter(line => line.id !== lineId));
  }

  protected updateVatPercentage(value: string | number | null): void {
    const parsed = typeof value === 'number' ? value : parseFloat(value ?? '0');
    if (!Number.isFinite(parsed)) {
      return;
    }
    this.vatPercentage.set(Math.max(0, parsed));
  }

  /**
   * Generates a unique ID
   */
  private generateId(): string {
    return `line-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  protected tableSubtotal(table: MaterialTable): number {
    return table.rows.reduce((sum, material) => sum + material.totalPrice, 0);
  }

  protected tableRowsLabel(table: MaterialTable): string {
    const count = table.rows.length;
    if (count === 0) {
      return 'Sin partidas';
    }
    return count === 1 ? '1 partida' : `${count} partidas`;
  }
}
