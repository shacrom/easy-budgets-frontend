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
  totalSimpleBlock = input<number>(0);

  // Inputs: visibility flags for each section
  showBlocks = input<boolean>(true);
  showMaterials = input<boolean>(true);
  showSimpleBlock = input<boolean>(true);

  // Inputs: data arrays to show details
  blocks = input<BudgetTextBlock[]>([]);
  materials = input<Material[]>([]);
  materialTables = input<MaterialTable[]>([]);

  // Inputs
  budgetId = input<number | null>(null);

  // Local state for configuration
  protected readonly vatPercentage = signal<number>(21);
  protected readonly editMode = signal<boolean>(false);

  // Input: initialAdditionalLines lets the parent pre-populate the state
  initialAdditionalLines = input<SummaryLine[]>([]);
  protected readonly additionalLines = signal<SummaryLine[]>([]);
  protected readonly conceptTypeOptions: Array<{ value: SummaryLineType; label: string }> = [
    { value: 'adjustment', label: 'Recargo' },
    { value: 'discount', label: 'Descuento' },
    { value: 'optional', label: 'Opcional' },
    { value: 'note', label: 'Nota' }
  ];

  // Manual save pattern
  protected readonly hasUnsavedChanges = signal<boolean>(false);
  protected readonly isSaving = signal<boolean>(false);

  // Store original state for discard
  private readonly originalVatPercentage = signal<number>(21);
  private readonly originalAdditionalLines = signal<SummaryLine[]>([]);

  // Outputs (only on manual save)
  readonly summaryChanged = output<BudgetSummary>();
  readonly vatPercentageChanged = output<number>();
  readonly additionalLinesChanged = output<SummaryLine[]>();

  constructor() {
    // Initialize internal additional lines from input
    effect(() => {
      const lines = this.initialAdditionalLines();
      if (Array.isArray(lines)) {
        const normalized = lines.map(line => this.normalizeLine(line));

        // Only update if different to avoid infinite loops
        const currentLines = this.additionalLines();
        if (currentLines.length === 0 && normalized.length > 0) {
          this.additionalLines.set(normalized);
          this.originalAdditionalLines.set(normalized);
        }
      }
    });

    // Auto-emit summary when totals change (needed for PDF recalculation)
    effect(() => {
      // Register all dependencies - when any changes, recalculate
      const totalBlocks = this.totalBlocks();
      const totalMaterials = this.totalMaterials();
      const totalSimpleBlock = this.totalSimpleBlock();
      this.additionalLines(); // Track changes to additional lines too
      this.vatPercentage(); // Track VAT changes

      // Emit whenever totals change (for PDF updates with recalculated discounts)
      if (totalBlocks > 0 || totalMaterials > 0 || totalSimpleBlock > 0) {
        const normalizedLines = this.additionalLines().map(line => this.normalizeLine(line));

        this.summaryChanged.emit({
          totalBlocks: this.effectiveTotalBlocks(),
          totalMaterials: this.effectiveTotalMaterials(),
          totalSimpleBlock: this.effectiveTotalSimpleBlock(),
          taxableBase: this.taxableBase(),
          vat: this.vat(),
          vatPercentage: this.vatPercentage(),
          grandTotal: this.grandTotal(),
          additionalLines: normalizedLines
        });
      }
    });
  }

  // Dropdown states (expanded by default)
  protected readonly blocksExpanded = signal<boolean>(true);
  protected readonly materialsExpanded = signal<boolean>(true);
  protected readonly hasBlocks = computed(() => this.showBlocks() && this.blocks().length > 0);
  protected readonly hasMaterials = computed(() => this.showMaterials() && (this.materials().length > 0 || this.materialTables().length > 0));
  protected readonly hasMaterialTables = computed(() => this.materialTables().length > 0);
  protected readonly hasSimpleBlock = computed(() => this.showSimpleBlock());

  // Computed values
  // Computed: effective totals based on visibility
  protected readonly effectiveTotalBlocks = computed(() => this.showBlocks() ? (this.totalBlocks() ?? 0) : 0);
  protected readonly effectiveTotalMaterials = computed(() => this.showMaterials() ? (this.totalMaterials() ?? 0) : 0);
  protected readonly effectiveTotalSimpleBlock = computed(() => this.showSimpleBlock() ? (this.totalSimpleBlock() ?? 0) : 0);

  protected readonly baseSubtotal = computed(() => {
    return this.effectiveTotalBlocks() + this.effectiveTotalMaterials() + this.effectiveTotalSimpleBlock();
  });

  protected readonly netAdjustments = computed(() => {
    const base = this.baseSubtotal();
    return this.additionalLines().reduce((sum, line) => {
      const amount = this.resolveLineAmount(line);
      const type = this.resolveLineType(line);

      if (type === 'discount') {
        // Descuento como porcentaje del subtotal base
        const discountAmount = base * (amount / 100);
        return sum - discountAmount;
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
  private nextClientId = -1;

  protected addAdditionalLine(): void {
    const newLine: SummaryLine = {
      id: this.generateId(),
      concept: '',
      amount: 0,
      conceptType: 'adjustment'
    };

    this.additionalLines.update(lines => [...lines, newLine]);
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Updates an additional line
   */
  protected updateAdditionalLine(updatedLine: SummaryLine): void {
    const normalized = this.normalizeLine(updatedLine);

    this.additionalLines.update(lines =>
      lines.map(line => line.id === normalized.id ? normalized : line)
    );
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Deletes an additional line
   */
  protected deleteAdditionalLine(lineId: number | undefined): void {
    if (lineId === undefined || lineId === null) {
      console.warn('Cannot delete line: invalid ID');
      return;
    }

    this.additionalLines.update(lines => lines.filter(line => line.id !== lineId));
    this.hasUnsavedChanges.set(true);
  }

  protected updateLineType(line: SummaryLine, type: SummaryLineType): void {
    this.updateAdditionalLine({ ...line, conceptType: type });
  }

  protected lineTypeLabel(type: SummaryLineType): string {
    return this.conceptTypeOptions.find(option => option.value === type)?.label ?? 'Concepto';
  }

  protected displayAmount(line: SummaryLine): number {
    const amount = this.resolveLineAmount(line);
    const type = this.resolveLineType(line);

    if (type === 'discount') {
      // Para descuentos, mostrar el porcentaje como negativo
      return -amount;
    }

    return amount;
  }

  protected displayCalculatedAmount(line: SummaryLine): number {
    const amount = this.resolveLineAmount(line);
    const type = this.resolveLineType(line);

    if (type === 'discount') {
      // Calcular el valor real del descuento en euros
      const discountAmount = this.baseSubtotal() * (amount / 100);
      return -discountAmount;
    }

    if (type === 'adjustment') {
      return amount;
    }

    return 0;
  }

  protected isDiscount(line: SummaryLine): boolean {
    return this.resolveLineType(line) === 'discount';
  }

  protected isAdjustment(line: SummaryLine): boolean {
    return this.resolveLineType(line) === 'adjustment';
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
    this.hasUnsavedChanges.set(true);
  }

  /**
   * Saves all changes and emits to parent
   */
  saveChanges(): void {
    this.isSaving.set(true);

    // Update original state
    this.originalVatPercentage.set(this.vatPercentage());
    this.originalAdditionalLines.set(this.additionalLines());

    // Emit all outputs
    const normalizedLines = this.additionalLines().map(line => this.normalizeLine(line));

    this.summaryChanged.emit({
      totalBlocks: this.effectiveTotalBlocks(),
      totalMaterials: this.effectiveTotalMaterials(),
      totalSimpleBlock: this.effectiveTotalSimpleBlock(),
      taxableBase: this.taxableBase(),
      vat: this.vat(),
      vatPercentage: this.vatPercentage(),
      grandTotal: this.grandTotal(),
      additionalLines: normalizedLines
    });

    this.vatPercentageChanged.emit(this.vatPercentage());
    this.additionalLinesChanged.emit(normalizedLines);

    this.hasUnsavedChanges.set(false);
    this.isSaving.set(false);
  }

  /**
   * Discards all changes and restores original state
   */
  discardChanges(): void {
    this.vatPercentage.set(this.originalVatPercentage());
    this.additionalLines.set(this.originalAdditionalLines());
    this.hasUnsavedChanges.set(false);
  }

  /**
   * Generates a unique ID
   */
  private generateId(): number {
    // Use decreasing negative numbers for client-only temporary ids
    return this.nextClientId--;
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
