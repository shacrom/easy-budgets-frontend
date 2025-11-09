import { Component, signal } from '@angular/core';
import { BudgetTextBlocksComponent } from './features/budgets/components/budget-text-blocks.component';
import { MaterialsTableComponent } from './features/materials/components/materials-table.component';
import { BudgetSummaryComponent } from './features/summary/components/budget-summary.component';
import { GeneralConditionsComponent } from './features/conditions/components/general-conditions.component';

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
}
