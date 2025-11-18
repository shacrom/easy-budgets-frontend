import { Component, signal, inject, effect, computed } from '@angular/core';
import { BudgetTextBlocksComponent } from '../../budgets/components/budget-text-blocks.component';
import { MaterialsTableComponent } from '../../materials/components/materials-table.component';
import { BudgetSummaryComponent } from '../../summary/components/budget-summary.component';
import { GeneralConditionsComponent } from '../../conditions/components/general-conditions.component';
import { CustomerSelectorComponent } from '../../customers/components/customer-selector.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { Material, MaterialTable } from '../../../models/material.model';
import { Customer } from '../../../models/customer.model';
import { SupabaseService } from '../../../services/supabase.service';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-budget-editor',
  imports: [
    CustomerSelectorComponent,
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
  protected readonly materialTables = signal<MaterialTable[]>([]);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly customersLoading = signal<boolean>(false);
  protected readonly updatingCustomer = signal<boolean>(false);
  protected readonly customerError = signal<string | null>(null);
  protected readonly selectedCustomerId = signal<string | null>(null);
  protected readonly selectedCustomer = computed(() => {
    const id = this.selectedCustomerId();
    if (!id) {
      return null;
    }
    return this.customers().find(customer => customer.id === id) ?? null;
  });

  constructor() {
    this.loadCustomers();
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
      const budget = await this.supabase.getBudget(id);
      this.currentBudgetId.set(id);

      const customerId = budget?.customer?.id ?? budget?.customerId ?? null;
      this.selectedCustomerId.set(customerId);
      this.ensureCustomerInList(budget?.customer as Customer | null | undefined);

      this.isInitialized.set(true);
    } catch (error) {
      console.error('No se pudo cargar el presupuesto seleccionado:', error);
      this.router.navigate(['/presupuestos']);
    }
  }

  private async loadCustomers(): Promise<void> {
    this.customersLoading.set(true);
    this.customerError.set(null);
    try {
      const customers = await this.supabase.getCustomers();
      this.customers.set(customers);
    } catch (error) {
      console.error('No se pudieron cargar los clientes:', error);
      this.customerError.set('No se pudieron cargar los clientes disponibles.');
    } finally {
      this.customersLoading.set(false);
    }
  }

  private ensureCustomerInList(customer?: Customer | null): void {
    if (!customer) {
      return;
    }

    this.customers.update(list => {
      const exists = list.some(item => item.id === customer.id);
      if (exists) {
        return list.map(item => item.id === customer.id ? { ...item, ...customer } : item);
      }
      return [...list, customer];
    });
  }

  protected async onCustomerSelected(customerId: string | null): Promise<void> {
    if (!this.currentBudgetId()) {
      return;
    }

    if (this.selectedCustomerId() === customerId) {
      return;
    }

    this.updatingCustomer.set(true);
    this.customerError.set(null);

    try {
      await this.supabase.updateBudget(this.currentBudgetId(), { customerId });
      this.selectedCustomerId.set(customerId);

      if (customerId) {
        const existing = this.customers().find(customer => customer.id === customerId);
        if (!existing) {
          const fetchedCustomer = await this.supabase.getCustomer(customerId);
          this.ensureCustomerInList(fetchedCustomer ?? undefined);
        }
      }
    } catch (error) {
      console.error('No se pudo actualizar el cliente del presupuesto:', error);
      this.customerError.set('No se pudo actualizar el cliente asociado al presupuesto.');
    } finally {
      this.updatingCustomer.set(false);
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

  protected onTablesChanged(tables: MaterialTable[]): void {
    this.materialTables.set(tables);
  }
}
