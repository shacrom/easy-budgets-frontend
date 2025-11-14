import { Component, signal, inject, effect } from '@angular/core';
import { BudgetTextBlocksComponent } from '../../budgets/components/budget-text-blocks.component';
import { MaterialsTableComponent } from '../../materials/components/materials-table.component';
import { BudgetSummaryComponent } from '../../summary/components/budget-summary.component';
import { GeneralConditionsComponent } from '../../conditions/components/general-conditions.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { Material } from '../../../models/material.model';
import { SupabaseService } from '../../../services/supabase.service';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-budget-editor',
  imports: [
    BudgetTextBlocksComponent,
    MaterialsTableComponent,
    BudgetSummaryComponent,
    GeneralConditionsComponent
  ],
  templateUrl: './budget-editor.component.html',
  styleUrl: './budget-editor.component.css'
})
export class BudgetEditorComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeParams = toSignal(this.route.paramMap);

  // Budget ID - will be initialized on component creation
  protected readonly currentBudgetId = signal<string>('');
  protected readonly isInitialized = signal<boolean>(false);

  // Totals from each section
  protected readonly totalBlocks = signal<number>(0);
  protected readonly totalMaterials = signal<number>(0);

  // Data arrays
  protected readonly blocks = signal<BudgetTextBlock[]>([]);
  protected readonly materials = signal<Material[]>([]);

  constructor() {
    effect(() => {
      const id = this.routeParams()?.get('id');
      if (!id) {
        this.isInitialized.set(false);
        return;
      }

      this.loadBudget(id);
    });
  }

  private async loadBudget(id: string): Promise<void> {
    this.isInitialized.set(false);
    try {
      await this.supabase.getBudget(id);
      this.currentBudgetId.set(id);
      this.isInitialized.set(true);
    } catch (error) {
      console.error('No se pudo cargar el presupuesto seleccionado:', error);
      this.router.navigate(['/presupuestos']);
    }
  }

  /**
   * Updates the blocks total
   */
  protected onTotalBlocksChanged(total: number): void {
    this.totalBlocks.set(total);
  }

  /**
   * Updates the materials total
   */
  protected onTotalMaterialsChanged(total: number): void {
    this.totalMaterials.set(total);
  }

  /**
   * Updates the blocks
   */
  protected onBlocksChanged(blocks: BudgetTextBlock[]): void {
    this.blocks.set(blocks);
  }

  /**
   * Updates the materials
   */
  protected onMaterialsChanged(materials: Material[]): void {
    this.materials.set(materials);
  }
}
