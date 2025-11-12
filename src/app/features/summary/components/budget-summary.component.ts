import { ChangeDetectionStrategy, Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetSummary, SummaryLine } from '../../../models/budget-summary.model';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { Material } from '../../../models/material.model';

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

  // Inputs: data arrays to show details
  blocks = input<BudgetTextBlock[]>([]);
  materials = input<Material[]>([]);

  // Local state for configuration
  protected readonly vatPercentage = signal<number>(21);
  protected readonly editMode = signal<boolean>(false);
  protected readonly additionalLines = signal<SummaryLine[]>([]);

  // Dropdown states (expanded by default)
  protected readonly blocksExpanded = signal<boolean>(true);
  protected readonly materialsExpanded = signal<boolean>(true);

  // Derived calculations
  protected readonly subtotal = computed(() => {
    return this.totalBlocks() + this.totalMaterials();
  });

  protected readonly totalAdditionalLines = computed(() => {
    return this.additionalLines().reduce((sum, line) => sum + line.importe, 0);
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
      concepto: '',
      importe: 0
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

  /**
   * Generates a unique ID
   */
  private generateId(): string {
    return `line-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
