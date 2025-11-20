import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

interface BudgetListItem {
  id: string;
  budgetNumber: string;
  title: string;
  status: string;
  total: number;
  totalBlocks?: number;
  totalMaterials?: number;
  createdAt: string;
  customer?: {
    name?: string;
  } | null;
}

@Component({
  selector: 'app-budgets-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './budgets-list.component.html',
  styleUrl: './budgets-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetsListComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  protected readonly budgets = signal<BudgetListItem[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isCreating = signal<boolean>(false);
  protected readonly deletingBudgetId = signal<string | null>(null);
  protected readonly duplicatingBudgetId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBudgets();
  }

  protected async loadBudgets(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.supabase.getBudgets();
      this.budgets.set(data);
    } catch (error) {
      console.error('Error loading budgets:', error);
      this.errorMessage.set('No se pudieron cargar los presupuestos.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async createBudget(): Promise<void> {
    if (this.isCreating()) return;

    this.isCreating.set(true);
    this.errorMessage.set(null);

    try {
      const budgetNumber = `BUD-${Date.now()}`;
      const newBudget = await this.supabase.createBudget({
        budgetNumber,
        customerId: null,
        title: 'Nuevo presupuesto',
        status: 'draft',
        subtotal: 0,
        taxPercentage: 21,
        taxAmount: 0,
        total: 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        showTextBlocks: true,
        showMaterials: true,
        showCountertop: false,
        showConditions: true
      });

      await this.router.navigate(['/presupuestos', newBudget.id]);
    } catch (error) {
      console.error('Error creating budget:', error);
      this.errorMessage.set('No se pudo crear el presupuesto.');
    } finally {
      this.isCreating.set(false);
    }
  }

  protected openBudget(budgetId: string): void {
    this.router.navigate(['/presupuestos', budgetId]);
  }

  protected async deleteBudget(budget: BudgetListItem): Promise<void> {
    const firstConfirmation = window.confirm(
      `¿Quieres eliminar el presupuesto ${budget.budgetNumber}?`
    );

    if (!firstConfirmation) {
      return;
    }

    this.deletingBudgetId.set(budget.id);
    this.errorMessage.set(null);

    try {
      await this.supabase.deleteBudget(budget.id);
      this.budgets.update(items => items.filter(item => item.id !== budget.id));
    } catch (error) {
      console.error('Error deleting budget:', error);
      this.errorMessage.set('No se pudo eliminar el presupuesto. Inténtalo de nuevo.');
    } finally {
      this.deletingBudgetId.set(null);
    }
  }

  protected async duplicateBudget(budget: BudgetListItem): Promise<void> {
    if (this.duplicatingBudgetId()) {
      return;
    }

    this.duplicatingBudgetId.set(budget.id);
    this.errorMessage.set(null);

    try {
      await this.supabase.duplicateBudget(budget.id);
      await this.loadBudgets();
    } catch (error) {
      console.error('Error duplicating budget:', error);
      this.errorMessage.set('No se pudo duplicar el presupuesto. Inténtalo de nuevo.');
    } finally {
      this.duplicatingBudgetId.set(null);
    }
  }
}
