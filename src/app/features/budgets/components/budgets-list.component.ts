import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { BudgetStatus } from '../../../models/budget.model';

type SortField = 'createdAt' | 'updatedAt';

interface BudgetListItem {
  id: number;
  budgetNumber: string;
  title: string;
  status: BudgetStatus;
  total: number;
  totalBlocks?: number;
  totalMaterials?: number;
  createdAt: string;
  updatedAt?: string | null;
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
  protected readonly deletingBudgetId = signal<number | null>(null);
  protected readonly duplicatingBudgetId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly customerFilter = signal<string>('');
  protected readonly startDateFilter = signal<string>('');
  protected readonly endDateFilter = signal<string>('');
  protected readonly sortField = signal<SortField>('createdAt');
  protected readonly pageSizeOptions = [5, 10, 25, 50];
  protected readonly pageSize = signal<number>(this.pageSizeOptions[2]);
  protected readonly currentPage = signal<number>(0);

  protected readonly sortOptions: ReadonlyArray<{ value: SortField; label: string }> = [
    { value: 'createdAt', label: 'Fecha de creación (más recientes)' },
    { value: 'updatedAt', label: 'Última actualización (más recientes)' }
  ];

  protected readonly hasFilters = computed(() =>
    Boolean(
      this.customerFilter().trim() ||
      this.startDateFilter() ||
      this.endDateFilter() ||
      this.sortField() !== 'createdAt'
    )
  );

  protected readonly filteredBudgets = computed(() => {
    const search = this.customerFilter().trim().toLowerCase();
    const startDate = this.parseDateFilter(this.startDateFilter(), false);
    const endDate = this.parseDateFilter(this.endDateFilter(), true);
    const orderField = this.sortField();

    return [...this.budgets()]
      .filter(budget => {
        if (!search) return true;
        const customerName = budget.customer?.name?.toLowerCase() ?? '';
        return customerName.includes(search);
      })
      .filter(budget => {
        if (!startDate && !endDate) return true;
        const createdAt = budget.createdAt ? new Date(budget.createdAt) : null;
        if (!createdAt) return true;
        if (startDate && createdAt < startDate) return false;
        if (endDate && createdAt > endDate) return false;
        return true;
      })
      .sort((a, b) => this.getBudgetDate(b, orderField) - this.getBudgetDate(a, orderField));
  });

  protected readonly totalFilteredBudgets = computed(() => this.filteredBudgets().length);
  protected readonly totalPages = computed(() => {
    const total = this.totalFilteredBudgets();
    return total === 0 ? 1 : Math.ceil(total / this.pageSize());
  });
  protected readonly paginatedBudgets = computed(() => {
    const startIndex = this.currentPage() * this.pageSize();
    return this.filteredBudgets().slice(startIndex, startIndex + this.pageSize());
  });

  protected readonly paginationLabel = computed(() => {
    const total = this.totalFilteredBudgets();
    if (total === 0) return 'Mostrando 0 de 0';

    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `Mostrando ${start} – ${end} de ${total}`;
  });

  protected readonly pagePosition = computed(() => {
    const total = this.totalFilteredBudgets();
    if (total === 0) return 'Página 0 de 0';
    return `Página ${this.currentPage() + 1} de ${this.totalPages()}`;
  });

  protected readonly isOnFirstPage = computed(() => this.currentPage() === 0);
  protected readonly isOnLastPage = computed(() => this.currentPage() >= this.totalPages() - 1);

  constructor() {
    effect(() => {
      const totalPages = this.totalPages();
      const current = this.currentPage();
      if (current > totalPages - 1) {
        this.currentPage.set(Math.max(totalPages - 1, 0));
      }
    });
  }

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
        status: 'not_completed',
        taxableBase: 0,
        taxPercentage: 21,
        taxAmount: 0,
        total: 0,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        showTextBlocks: true,
        showMaterials: true,
        showCountertop: false,
        showConditions: true
      });

      await this.router.navigate(['/presupuestos', String(newBudget.id)]);
    } catch (error) {
      console.error('Error creating budget:', error);
      this.errorMessage.set('No se pudo crear el presupuesto.');
    } finally {
      this.isCreating.set(false);
    }
  }

  protected openBudget(budgetId: number): void {
    this.router.navigate(['/presupuestos', String(budgetId)]);
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

  protected clearFilters(): void {
    this.customerFilter.set('');
    this.startDateFilter.set('');
    this.endDateFilter.set('');
    this.sortField.set('createdAt');
    this.currentPage.set(0);
  }

  protected changeSortField(value: string): void {
    this.sortField.set((value as SortField) ?? 'createdAt');
    this.currentPage.set(0);
  }

  protected updateCustomerFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.customerFilter.set(input.value);
    this.currentPage.set(0);
  }

  protected updateStartDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.startDateFilter.set(input.value);
    this.currentPage.set(0);
  }

  protected updateEndDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.endDateFilter.set(input.value);
    this.currentPage.set(0);
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(0);
  }

  protected formatStatus(status: BudgetStatus): string {
    return status === 'completed' ? 'Completado' : 'No completado';
  }

  protected goToFirstPage(): void {
    if (this.isOnFirstPage()) return;
    this.currentPage.set(0);
  }

  protected goToPreviousPage(): void {
    if (this.isOnFirstPage()) return;
    this.currentPage.update(page => Math.max(page - 1, 0));
  }

  protected goToNextPage(): void {
    if (this.isOnLastPage()) return;
    this.currentPage.update(page => Math.min(page + 1, this.totalPages() - 1));
  }

  protected goToLastPage(): void {
    if (this.isOnLastPage()) return;
    this.currentPage.set(this.totalPages() - 1);
  }

  private parseDateFilter(value: string, endOfDay: boolean): Date | null {
    if (!value) return null;
    const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
    return new Date(`${value}${suffix}`);
  }

  private getBudgetDate(budget: BudgetListItem, field: SortField): number {
    const value = field === 'createdAt' ? budget.createdAt : budget.updatedAt;
    return value ? new Date(value).getTime() : 0;
  }
}
