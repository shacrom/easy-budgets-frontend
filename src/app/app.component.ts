import { Component, signal } from '@angular/core';
import { BudgetTextBlocksComponent } from './features/budgets/components/budget-text-blocks.component';
import { MaterialsTableComponent } from './features/materials/components/materials-table.component';
import { BudgetSummaryComponent } from './features/summary/components/budget-summary.component';
import { GeneralConditionsComponent } from './features/conditions/components/general-conditions.component';
import { BudgetTextBlock } from './models/budget-text-block.model';
import { Material } from './models/material.model';

@Component({
  selector: 'app-root',
  imports: [
    BudgetTextBlocksComponent,
    MaterialsTableComponent,
    BudgetSummaryComponent,
    GeneralConditionsComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'easy-budgets-frontend';

  // Totales de cada sección
  protected readonly totalBloques = signal<number>(0);
  protected readonly totalMateriales = signal<number>(0);

  // Arrays de datos
  protected readonly bloques = signal<BudgetTextBlock[]>([]);
  protected readonly materiales = signal<Material[]>([]);

  /**
   * Actualiza el total de bloques
   */
  protected onTotalBloquesChanged(total: number): void {
    this.totalBloques.set(total);
  }

  /**
   * Actualiza el total de materiales
   */
  protected onTotalMaterialesChanged(total: number): void {
    this.totalMateriales.set(total);
  }

  /**
   * Actualiza los bloques
   */
  protected onBloquesChanged(bloques: BudgetTextBlock[]): void {
    this.bloques.set(bloques);
  }

  /**
   * Actualiza los materiales
   */
  protected onMaterialesChanged(materiales: Material[]): void {
    this.materiales.set(materiales);
  }
}
