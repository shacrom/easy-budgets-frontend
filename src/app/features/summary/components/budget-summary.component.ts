import { ChangeDetectionStrategy, Component, input, signal, computed, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetSummary, SummaryLine, SummaryLineType } from '../../../models/budget-summary.model';
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

  // Inputs
  budgetId = input<string | null>(null);
  // Local state for configuration
  protected readonly vatPercentage = signal<number>(21);
  protected readonly editMode = signal<boolean>(false);
  protected readonly additionalLines = signal<SummaryLine[]>([]);
  protected readonly conceptTypeOptions: Array<{ value: SummaryLineType; label: string }> = [
    { value: 'adjustment', label: 'Recargo' },
    { value: 'discount', label: 'Descuento' },
    { value: 'optional', label: 'Opcional' },
    { value: 'note', label: 'Nota' }
  ];

  readonly summaryChanged = output<BudgetSummary>();
  readonly vatPercentageChanged = output<number>();
  readonly additionalLinesChanged = output<SummaryLine[]>();

  constructor() {
    effect(() => {
      const normalizedLines = this.additionalLines().map(line => this.normalizeLine(line));
      this.summaryChanged.emit({
        totalBlocks: this.totalBlocks(),
        totalMaterials: this.totalMaterials(),
        totalCountertop: this.totalCountertop(),
        taxableBase: this.taxableBase(),
        vat: this.vat(),
        vatPercentage: this.vatPercentage(),
        grandTotal: this.grandTotal(),
        additionalLines: normalizedLines
      });
    });

    effect(() => {
      this.vatPercentageChanged.emit(this.vatPercentage());
    });

    effect(() => {
      const normalizedLines = this.additionalLines().map(line => this.normalizeLine(line));
      this.additionalLinesChanged.emit(normalizedLines);
    });
  }

  // Dropdown states (expanded by default)
  protected readonly blocksExpanded = signal<boolean>(true);
  protected readonly materialsExpanded = signal<boolean>(true);
  protected readonly hasMaterialTables = computed(() => this.materialTables().length > 0);

  // Computed values
  protected readonly baseSubtotal = computed(() => {
    return (this.totalBlocks() ?? 0) + (this.totalMaterials() ?? 0) + (this.totalCountertop() ?? 0);
  });

  protected readonly netAdjustments = computed(() => {
    return this.additionalLines().reduce((sum, line) => {
      const amount = this.resolveLineAmount(line);
      const type = this.resolveLineType(line);

      if (type === 'discount') {
        return sum - amount;
      }

      if (type === 'adjustment') {
        return sum + amount;
      }

      return sum;
    }, 0);
  });

  protected readonly totalAdditionalLines = computed(() => this.netAdjustments());

  protected readonly taxableBase = computed(() => {
    const total = this.baseSubtotal() + this.netAdjustments();
    return Number(Math.max(total, 0).toFixed(2));
  });

  protected readonly taxableBaseWithAdditionals = computed(() => this.taxableBase());

  protected readonly vat = computed(() => {
    return this.taxableBase() * (this.vatPercentage() / 100);
  });

  protected readonly grandTotal = computed(() => {
    return this.taxableBase() + this.vat();
  });

  protected readonly optionalLinesTotal = computed(() => {
    return this.additionalLines()
      .filter(line => this.resolveLineType(line) === 'optional')
      .reduce((sum, line) => sum + this.resolveLineAmount(line), 0);
  });

  protected readonly hasOptionalLines = computed(() => this.optionalLinesTotal() > 0);

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
      amount: 0,
      conceptType: 'adjustment'
    };

    this.additionalLines.update(lines => [...lines, newLine]);
  }

  /**
   * Updates an additional line
   */
  protected updateAdditionalLine(updatedLine: SummaryLine): void {
    const normalized = this.normalizeLine(updatedLine);

    this.additionalLines.update(lines =>
      lines.map(line => line.id === normalized.id ? normalized : line)
    );
  }

  /**
   * Deletes an additional line
   */
  protected deleteAdditionalLine(lineId: string): void {
    this.additionalLines.update(lines => lines.filter(line => line.id !== lineId));
  }

  protected updateLineType(line: SummaryLine, type: SummaryLineType): void {
    this.updateAdditionalLine({ ...line, conceptType: type });
  }

  protected lineTypeLabel(type: SummaryLineType): string {
    return this.conceptTypeOptions.find(option => option.value === type)?.label ?? 'Concepto';
  }

  protected displayAmount(line: SummaryLine): number {
    const amount = this.resolveLineAmount(line);
    return this.resolveLineType(line) === 'discount' ? -amount : amount;
  }

  protected isNote(line: SummaryLine): boolean {
    return this.resolveLineType(line) === 'note';
  }

  protected isOptional(line: SummaryLine): boolean {
    return this.resolveLineType(line) === 'optional';
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

  private resolveLineType(line: SummaryLine | null | undefined): SummaryLineType {
    if (!line?.conceptType) {
      return 'adjustment';
    }
    return line.conceptType;
  }

  private resolveLineAmount(line: SummaryLine | null | undefined): number {
    if (!line) {
      return 0;
    }
    const raw = typeof line.amount === 'number' ? line.amount : parseFloat(String(line.amount));
    return Number.isFinite(raw) ? Math.abs(raw) : 0;
  }

  private normalizeLine(line: SummaryLine): SummaryLine {
    const type = this.resolveLineType(line);
    const sanitizedAmount = type === 'note' ? 0 : this.resolveLineAmount(line);
    const normalizedConcept = line.concept?.trim() ?? '';

    return {
      ...line,
      concept: normalizedConcept,
      amount: sanitizedAmount,
      conceptType: type
    };
  }
}
