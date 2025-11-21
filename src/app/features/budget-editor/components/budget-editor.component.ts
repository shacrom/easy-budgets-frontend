import { Component, signal, inject, effect, computed, untracked } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BudgetTextBlocksComponent } from '../../budgets/components/budget-text-blocks.component';
import { MaterialsTableComponent } from '../../materials/components/materials-table.component';
import { BudgetSummaryComponent } from '../../summary/components/budget-summary.component';
import { GeneralConditionsComponent } from '../../conditions/components/general-conditions.component';
import { CustomerSelectorComponent } from '../../customers/components/customer-selector.component';
import { BudgetTextBlock } from '../../../models/budget-text-block.model';
import { Material, MaterialTable } from '../../../models/material.model';
import { Customer } from '../../../models/customer.model';
import { BudgetSummary } from '../../../models/budget-summary.model';
import { Condition } from '../../../models/conditions.model';
import { SupabaseService } from '../../../services/supabase.service';
import { PdfExportService, BudgetPdfPayload, BudgetPdfMetadata } from '../../../services/pdf-export.service';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CountertopEditorComponent } from '../../countertop/components/countertop-editor.component';
import { Countertop } from '../../../models/countertop.model';

@Component({
  selector: 'app-budget-editor',
  imports: [
    CustomerSelectorComponent,
    BudgetTextBlocksComponent,
    MaterialsTableComponent,
    CountertopEditorComponent,
    BudgetSummaryComponent,
    GeneralConditionsComponent
  ],
  templateUrl: './budget-editor.component.html',
  styleUrl: './budget-editor.component.css'
})
export class BudgetEditorComponent {
  private readonly supabase = inject(SupabaseService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeParams = toSignal(this.route.paramMap);

  // Budget ID - will be initialized on component creation
  protected readonly currentBudgetId = signal<string>('');
  protected readonly isInitialized = signal<boolean>(false);

  // Totals from each section
  protected readonly totalBlocks = signal<number>(0);
  protected readonly totalMaterials = signal<number>(0);
  protected readonly totalCountertop = signal<number>(0);

  // Data arrays
  protected readonly blocks = signal<BudgetTextBlock[]>([]);
  protected readonly materials = signal<Material[]>([]);
  protected readonly materialTables = signal<MaterialTable[]>([]);
  protected readonly customers = signal<Customer[]>([]);
  protected readonly customerSearchTerm = signal<string>('');
  protected readonly customersLoading = signal<boolean>(false);
  protected readonly updatingCustomer = signal<boolean>(false);
  protected readonly customerError = signal<string | null>(null);
  protected readonly selectedCustomerId = signal<string | null>(null);
  private readonly cachedSelectedCustomer = signal<Customer | null>(null);
  protected readonly budgetMeta = signal<BudgetPdfMetadata | null>(null);
  protected readonly summarySnapshot = signal<BudgetSummary | null>(null);
  protected readonly conditionsTitle = signal<string>('Condiciones generales');
  protected readonly conditionsList = signal<Condition[]>([]);
  protected readonly pdfGenerating = signal<boolean>(false);
  protected readonly countertopData = signal<Countertop | null>(null);

  // Visibility signals
  protected readonly showTextBlocks = signal<boolean>(true);
  protected readonly showMaterials = signal<boolean>(true);
  protected readonly showCountertop = signal<boolean>(false);
  protected readonly showConditions = signal<boolean>(true);

  // PDF Preview
  protected readonly showPdfPreview = signal<boolean>(false);
  protected readonly pdfPreviewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly isPreviewLoading = signal<boolean>(false);

  protected readonly selectedCustomer = computed(() => this.cachedSelectedCustomer());

  private customerSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private latestCustomerSearchId = 0;

  constructor() {
    effect(() => {
      const id = this.routeParams()?.get('id');
      if (!id) {
        this.isInitialized.set(false);
        return;
      }

      this.loadBudget(id);
    });

    // Effect for PDF Preview
    effect(() => {
      if (this.showPdfPreview() && this.isInitialized()) {
        // Register dependencies to trigger re-run
        this.blocks();
        this.materials();
        this.materialTables();
        this.countertopData();
        this.summarySnapshot();
        this.conditionsList();
        this.selectedCustomer();
        this.showTextBlocks();
        this.showMaterials();
        this.showCountertop();
        this.showConditions();
        this.budgetMeta();
        this.conditionsTitle();

        // Update preview
        untracked(() => {
          this.updatePdfPreview();
        });
      }
    });
  }

  private buildPdfPayload(): BudgetPdfPayload {
    return {
      metadata: this.budgetMeta(),
      customer: this.selectedCustomer(),
      blocks: this.showTextBlocks() ? this.blocks() : [],
      materials: this.showMaterials() ? this.materials() : [],
      materialTables: this.showMaterials() ? this.materialTables() : [],
      countertop: this.showCountertop() ? this.countertopData() : null,
      summary: this.summarySnapshot(),
      conditionsTitle: this.conditionsTitle(),
      conditions: this.showConditions() ? this.conditionsList() : [],
      generatedAt: new Date().toISOString()
    };
  }

  async updatePdfPreview() {
    if (this.isPreviewLoading()) return;

    this.isPreviewLoading.set(true);
    try {
      const payload = this.buildPdfPayload();
      const url = await this.pdfExport.getBudgetPdfBlobUrl(payload);
      this.pdfPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } catch (error) {
      console.error('Error updating PDF preview:', error);
    } finally {
      this.isPreviewLoading.set(false);
    }
  }

  togglePdfPreview() {
    this.showPdfPreview.update(v => !v);
  }

  private async loadBudget(id: string): Promise<void> {
    this.isInitialized.set(false);
    try {
      const budget = await this.supabase.getBudget(id);
      this.currentBudgetId.set(id);

      this.budgetMeta.set({
        id,
        budgetNumber: budget?.budgetNumber ?? null,
        title: budget?.title ?? null,
        status: budget?.status ?? null,
        validUntil: budget?.validUntil ?? null,
        createdAt: budget?.createdAt ?? null
      });

      this.showTextBlocks.set(budget.showTextBlocks ?? true);
      this.showMaterials.set(budget.showMaterials ?? true);
      this.showCountertop.set(budget.showCountertop ?? false);
      this.showConditions.set(budget.showConditions ?? true);

      const relationalTables = Array.isArray(budget.materialTables) ? budget.materialTables : [];
      this.materialTables.set(relationalTables);
      this.materials.set(this.flattenMaterials(relationalTables));
      this.totalMaterials.set(this.calculateMaterialsTotal(relationalTables));

      const customerId = budget?.customer?.id ?? budget?.customerId ?? null;
      this.selectedCustomerId.set(customerId);
  this.cachedSelectedCustomer.set((budget?.customer as Customer | null | undefined) ?? null);

      this.isInitialized.set(true);
    } catch (error) {
      console.error('No se pudo cargar el presupuesto seleccionado:', error);
      this.router.navigate(['/presupuestos']);
    }
  }

  protected onCustomerSearchChanged(term: string): void {
    this.customerSearchTerm.set(term);
    if (this.customerSearchTimer) {
      clearTimeout(this.customerSearchTimer);
      this.customerSearchTimer = null;
    }

    if (!this.shouldExecuteCustomerSearch(term)) {
      this.customersLoading.set(false);
      this.customers.set([]);
      this.customerError.set(null);
      return;
    }

    this.customerSearchTimer = setTimeout(() => {
      void this.performCustomerSearch(term);
    }, 350);
  }

  protected refreshCustomerResults(): void {
    if (this.customerSearchTimer) {
      clearTimeout(this.customerSearchTimer);
      this.customerSearchTimer = null;
    }

    const term = this.customerSearchTerm();
    if (!this.shouldExecuteCustomerSearch(term)) {
      return;
    }

    void this.performCustomerSearch(term);
  }

  private async performCustomerSearch(rawTerm: string): Promise<void> {
    const requestId = ++this.latestCustomerSearchId;
    this.customersLoading.set(true);
    this.customerError.set(null);

    const term = rawTerm?.trim() ?? '';

    try {
      const results = await this.supabase.searchCustomers(term, 10);
      if (this.latestCustomerSearchId !== requestId) {
        return;
      }

      this.customers.set(results);
      this.refreshSelectedCustomerFromResults(results);
    } catch (error) {
      if (this.latestCustomerSearchId !== requestId) {
        return;
      }

      console.error('No se pudieron buscar los clientes:', error);
      this.customerError.set('No se pudieron buscar clientes. Inténtalo de nuevo en unos segundos.');
    } finally {
      if (this.latestCustomerSearchId === requestId) {
        this.customersLoading.set(false);
      }
    }
  }

  private refreshSelectedCustomerFromResults(results: Customer[]): void {
    const currentId = this.selectedCustomerId();
    if (!currentId) {
      return;
    }

    const match = results.find(customer => customer.id === currentId);
    if (match) {
      this.cachedSelectedCustomer.set(match);
    }
  }

  private shouldExecuteCustomerSearch(term: string): boolean {
    const trimmed = term?.trim() ?? '';
    return trimmed.length >= 2;
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

      if (!customerId) {
        this.cachedSelectedCustomer.set(null);
        return;
      }

      const existing = this.customers().find(customer => customer.id === customerId);
      if (existing) {
        this.cachedSelectedCustomer.set(existing);
      } else {
        const fetchedCustomer = await this.supabase.getCustomer(customerId);
        this.cachedSelectedCustomer.set(fetchedCustomer ?? null);
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

  protected onTotalCountertopChanged(total: number) {
    this.totalCountertop.set(total);
  }

  protected onCountertopChanged(countertop: Countertop | null) {
    this.countertopData.set(countertop);
    // If we receive data (even if empty but loaded), we might want to show it.
    // But specifically, if it has content, we definitely show it.
    // If it's null (deleted), we hide it.
    if (countertop === null) {
      this.showCountertop.set(false);
    } else if (countertop.model || countertop.price > 0 || countertop.imageUrl) {
      this.showCountertop.set(true);
    }
  }

  protected onCountertopDeleted() {
    this.showCountertop.set(false);
    this.countertopData.set(null);
    this.totalCountertop.set(0);
  }

  toggleCountertop() {
    this.showCountertop.update(v => !v);
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

  protected async onTablesChanged(tables: MaterialTable[]): Promise<void> {
    this.materialTables.set(tables);

    const id = this.currentBudgetId();
    if (id) {
      try {
        await this.supabase.saveMaterialTables(id, tables);
      } catch (error) {
        console.error('Error saving material tables:', error);
      }
    }
  }

  protected onSummaryChanged(summary: BudgetSummary): void {
    this.summarySnapshot.set(summary);
  }

  protected onConditionsTitleChanged(title: string): void {
    this.conditionsTitle.set(title);
  }

  protected onConditionsChanged(conditions: Condition[]): void {
    this.conditionsList.set(conditions);
  }

  protected async exportBudgetPdf(): Promise<void> {
    if (!this.currentBudgetId() || this.pdfGenerating()) {
      return;
    }

    this.pdfGenerating.set(true);

    try {
      const payload = this.buildPdfPayload();
      await this.pdfExport.generateBudgetPdf(payload);
    } catch (error) {
      console.error('Error al generar el PDF del presupuesto:', error);
    } finally {
      this.pdfGenerating.set(false);
    }
  }

  protected async previewBudgetPdf(): Promise<void> {
    if (!this.currentBudgetId() || this.pdfGenerating()) {
      return;
    }

    this.pdfGenerating.set(true);

    try {
      const payload = this.buildPdfPayload();
      await this.pdfExport.openBudgetPdf(payload);
    } catch (error) {
      console.error('Error al previsualizar el PDF del presupuesto:', error);
    } finally {
      this.pdfGenerating.set(false);
    }
  }

  private flattenMaterials(tables: MaterialTable[]): Material[] {
    return tables.flatMap(table =>
      (table.rows ?? []).map((row, rowIndex) => ({
        ...row,
        tableId: row.tableId ?? table.id,
        orderIndex: row.orderIndex ?? rowIndex
      }))
    );
  }

  private calculateMaterialsTotal(tables: MaterialTable[]): number {
    return tables.reduce((tableSum, table) =>
      tableSum + (table.rows ?? []).reduce((rowSum, row) => rowSum + (row.totalPrice ?? 0), 0),
    0);
  }

  async toggleSection(section: 'textBlocks' | 'materials' | 'countertop' | 'conditions') {
    const id = this.currentBudgetId();
    if (!id) return;

    let updates: any = {};
    switch (section) {
      case 'textBlocks':
        const newTextBlocks = !this.showTextBlocks();
        this.showTextBlocks.set(newTextBlocks);
        updates = { showTextBlocks: newTextBlocks };
        break;
      case 'materials':
        const newMaterials = !this.showMaterials();
        this.showMaterials.set(newMaterials);
        updates = { showMaterials: newMaterials };
        break;
      case 'countertop':
        const newCountertop = !this.showCountertop();
        this.showCountertop.set(newCountertop);
        updates = { showCountertop: newCountertop };
        break;
      case 'conditions':
        const newConditions = !this.showConditions();
        this.showConditions.set(newConditions);
        updates = { showConditions: newConditions };
        break;
    }

    try {
      await this.supabase.updateBudget(id, updates);
    } catch (error) {
      console.error('Error updating section visibility:', error);
    }
  }
}
