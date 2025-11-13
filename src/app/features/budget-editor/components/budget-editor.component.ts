import { Component, signal, inject, effect } from '@angular/core';
import { BudgetTextBlocksComponent } from '../../budgets/components/budget-text-blocks.component';
import { MaterialsTableComponent } from '../../materials/components/materials-table.component';
import { BudgetSummaryComponent } from '../../summary/components/budget-summary.component';
import { GeneralConditionsComponent } from '../../conditions/components/general-conditions.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { Material } from '../../../models/material.model';
import { SupabaseService } from '../../../services/supabase.service';

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
    // Initialize budget on component creation
    this.initializeBudget();
  }

  /**
   * Initialize or create a test budget
   * TODO: Replace this with proper routing/budget selection
   */
  private async initializeBudget(): Promise<void> {
    try {
      // Check if there's a budget ID in localStorage (for development)
      const storedBudgetId = localStorage.getItem('currentBudgetId');
      
      if (storedBudgetId) {
        // Verify it exists in the database
        try {
          await this.supabase.getBudget(storedBudgetId);
          this.currentBudgetId.set(storedBudgetId);
          this.isInitialized.set(true);
          console.log('Loaded existing budget:', storedBudgetId);
          return;
        } catch (error) {
          console.log('Stored budget not found, creating new one...');
          localStorage.removeItem('currentBudgetId');
        }
      }

      // Create a new test budget
      const budgetNumber = `TEST-${Date.now()}`;
      const newBudget = await this.supabase.createBudget({
        budgetNumber: budgetNumber,
        customerId: null, // TODO: Add customer selection
        title: 'Presupuesto de prueba',
        status: 'draft',
        subtotal: 0,
        taxPercentage: 21,
        taxAmount: 0,
        total: 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 días, formato YYYY-MM-DD
      });

      this.currentBudgetId.set(newBudget.id);
      localStorage.setItem('currentBudgetId', newBudget.id);
      this.isInitialized.set(true);
      console.log('Created new budget:', newBudget.id);
    } catch (error) {
      console.error('Error initializing budget:', error);
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
