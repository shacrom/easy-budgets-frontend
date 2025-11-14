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
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
}
