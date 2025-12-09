import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetsListComponent } from './budgets-list.component';
import { SupabaseService } from '../../../services/supabase.service';
import { Router } from '@angular/router';
import { BudgetStatus } from '../../../models/budget.model';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { describe, it, expect, beforeEach, beforeAll, vi, type Mock } from 'vitest';

describe('BudgetsListComponent', () => {
  let component: BudgetsListComponent;
  let fixture: ComponentFixture<BudgetsListComponent>;
  let supabaseServiceMock: {
    getBudgets: Mock;
    createBudget: Mock;
    deleteBudget: Mock;
    duplicateBudget: Mock;
  };
  let routerMock: { navigate: Mock };

  beforeAll(() => {
    registerLocaleData(localeEs);
  });

  const mockBudgets = [
    {
      id: 1,
      budgetNumber: 'BUD-001',
      title: 'Budget 1',
      status: 'not_completed' as BudgetStatus,
      total: 100,
      taxableBase: 82.64,
      taxPercentage: 21,
      taxAmount: 17.36,
      createdAt: '2023-01-01T10:00:00.000Z',
      updatedAt: null,
      customer: { name: 'Customer A' }
    },
    {
      id: 2,
      budgetNumber: 'BUD-002',
      title: 'Budget 2',
      status: 'completed' as BudgetStatus,
      total: 200,
      taxableBase: 165.29,
      taxPercentage: 21,
      taxAmount: 34.71,
      createdAt: '2023-01-02T10:00:00.000Z',
      updatedAt: null,
      customer: { name: 'Customer B' }
    },
    {
      id: 3,
      budgetNumber: 'BUD-003',
      title: 'Budget 3',
      status: 'not_completed' as BudgetStatus,
      total: 300,
      taxableBase: 247.93,
      taxPercentage: 21,
      taxAmount: 52.07,
      createdAt: '2023-01-03T10:00:00.000Z',
      updatedAt: null,
      customer: { name: 'Customer A' }
    }
  ];

  beforeEach(async () => {
    supabaseServiceMock = {
      getBudgets: vi.fn().mockResolvedValue(mockBudgets),
      createBudget: vi.fn(),
      deleteBudget: vi.fn(),
      duplicateBudget: vi.fn()
    };
    routerMock = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [BudgetsListComponent],
      providers: [
        { provide: SupabaseService, useValue: supabaseServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit -> loadBudgets
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load budgets on init', async () => {
    await fixture.whenStable();
    expect(supabaseServiceMock.getBudgets).toHaveBeenCalled();
    expect((component as any).budgets().length).toBe(3);
    expect((component as any).isLoading()).toBe(false);
  });

  it('should filter budgets by customer name', async () => {
    await fixture.whenStable();

    (component as any).customerFilter.set('Customer A');
    fixture.detectChanges();

    expect((component as any).filteredBudgets().length).toBe(2);
    // Default sort is createdAt desc, so Budget 3 (Jan 3) comes before Budget 1 (Jan 1)
    expect((component as any).filteredBudgets()[0].budgetNumber).toBe('BUD-003');
  });

  it('should paginate budgets correctly', async () => {
    await fixture.whenStable();

    // Set page size to 1
    (component as any).pageSize.set(1);
    fixture.detectChanges();

    expect((component as any).totalPages()).toBe(3);
    expect((component as any).paginatedBudgets().length).toBe(1);
    expect((component as any).paginatedBudgets()[0].id).toBe(3); // First one (newest)

    // Go to next page
    (component as any).goToNextPage();
    fixture.detectChanges();

    expect((component as any).currentPage()).toBe(1);
    expect((component as any).paginatedBudgets()[0].id).toBe(2);
  });

  it('should create a new budget', async () => {
    const newBudgetMock = { id: 123 };
    supabaseServiceMock.createBudget.mockResolvedValue(newBudgetMock as any);

    await (component as any).createBudget();

    expect(supabaseServiceMock.createBudget).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/presupuestos', '123']);
  });

  it('should delete a budget', async () => {
    await fixture.whenStable();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    supabaseServiceMock.deleteBudget.mockResolvedValue(undefined);

    const budgetToDelete = mockBudgets[0];
    await (component as any).deleteBudget(budgetToDelete);

    expect(supabaseServiceMock.deleteBudget).toHaveBeenCalledWith(budgetToDelete.id);
    expect((component as any).budgets().find((b: any) => b.id === budgetToDelete.id)).toBeUndefined();
  });

  it('should duplicate a budget', async () => {
    await fixture.whenStable();
    supabaseServiceMock.duplicateBudget.mockResolvedValue({} as any);

    const budgetToDuplicate = mockBudgets[0];
    await (component as any).duplicateBudget(budgetToDuplicate);

    expect(supabaseServiceMock.duplicateBudget).toHaveBeenCalledWith(budgetToDuplicate.id);
    expect(supabaseServiceMock.getBudgets).toHaveBeenCalledTimes(2); // Initial load + reload after duplicate
  });

  it('should clear filters', async () => {
    (component as any).customerFilter.set('test');
    (component as any).currentPage.set(2);

    (component as any).clearFilters();

    expect((component as any).customerFilter()).toBe('');
    expect((component as any).currentPage()).toBe(0);
  });
});
