import { Component, signal, inject, effect, computed, untracked, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
import { BudgetStatus } from '../../../models/budget.model';

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
export class BudgetEditorComponent implements OnDestroy, AfterViewInit {
  private readonly supabase = inject(SupabaseService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeParams = toSignal(this.route.paramMap);

  @ViewChild('pdfIframe') pdfIframeRef!: ElementRef<HTMLIFrameElement>;

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
  protected readonly materialsSectionTitle = signal<string>('Materiales y equipamiento');
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
  protected readonly budgetTitleInput = signal<string>('');
  protected readonly savingBudgetTitle = signal<boolean>(false);

  // Logo URLs
  protected readonly companyLogoUrl = signal<string>('');
  protected readonly supplierLogoUrl = signal<string>('');
  protected readonly uploadingCompanyLogo = signal<boolean>(false);
  protected readonly uploadingSupplierLogo = signal<boolean>(false);

  // Visibility signals
  protected readonly showTextBlocks = signal<boolean>(true);
  protected readonly showMaterials = signal<boolean>(true);
  protected readonly showCountertop = signal<boolean>(false);
  protected readonly showConditions = signal<boolean>(true);
  protected readonly togglingStatus = signal<boolean>(false);

  // PDF Preview
  protected readonly showPdfPreview = signal<boolean>(false);
  protected readonly pdfPreviewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly isPreviewLoading = signal<boolean>(false);
  protected readonly currentPdfPage = signal<number>(1);
  protected readonly totalPdfPages = signal<number>(1);
  private pdfIframeElement: HTMLIFrameElement | null = null;
  private savedScrollTop = 0;
  private currentPdfBlobUrl: string | null = null;
  private pdfUpdateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly PDF_UPDATE_DEBOUNCE_MS = 800;

  protected readonly selectedCustomer = computed(() => this.cachedSelectedCustomer());
  protected readonly isBudgetCompleted = computed(() => (this.budgetMeta()?.status ?? '').toLowerCase() === 'completed');
  protected readonly completionStateLabel = computed(() => this.isBudgetCompleted() ? 'Completado' : 'No completado');
  protected readonly completionStateIcon = computed(() => this.isBudgetCompleted() ? 'task_alt' : 'hourglass_top');
  protected readonly completionActionLabel = computed(() => this.isBudgetCompleted() ? 'Marcar como no completado' : 'Marcar como completado');
  protected readonly completionActionIcon = computed(() => this.isBudgetCompleted() ? 'undo' : 'check_circle');

  private customerSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private latestCustomerSearchId = 0;
  private summaryPersistenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSummaryTotals: BudgetSummary | null = null;
  private readonly SUMMARY_PERSIST_DEBOUNCE_MS = 500;

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
        this.materialsSectionTitle();
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

  ngAfterViewInit(): void {
    // Set up iframe load listener for scroll restoration
    if (this.pdfIframeRef?.nativeElement) {
      this.setupIframeScrollTracking();
    }
  }

  private setupIframeScrollTracking(): void {
    // Watch for iframe becoming available when preview is shown
    const checkIframe = setInterval(() => {
      const iframe = this.pdfIframeRef?.nativeElement;
      if (iframe && this.showPdfPreview()) {
        this.pdfIframeElement = iframe;
        clearInterval(checkIframe);
      }
    }, 100);

    // Clear interval after 5 seconds to avoid memory leaks
    setTimeout(() => clearInterval(checkIframe), 5000);
  }

  private buildPdfPayload(): BudgetPdfPayload {
    // Crear un summary filtrado basado en las secciones visibles
    const originalSummary = this.summarySnapshot();
    const filteredSummary: BudgetSummary | null = originalSummary ? {
      ...originalSummary,
      totalBlocks: this.showTextBlocks() ? originalSummary.totalBlocks : 0,
      totalMaterials: this.showMaterials() ? originalSummary.totalMaterials : 0,
      totalCountertop: this.showCountertop() ? originalSummary.totalCountertop : 0
    } : null;

    // Recalcular taxableBase y grandTotal basado en secciones visibles
    if (filteredSummary) {
      const visibleTotal = filteredSummary.totalBlocks + filteredSummary.totalMaterials + (filteredSummary.totalCountertop ?? 0);

      // Sumar líneas adicionales (descuentos, ajustes, etc.)
      let additionalTotal = 0;
      if (filteredSummary.additionalLines?.length) {
        filteredSummary.additionalLines.forEach(line => {
          if (line.conceptType !== 'note') {
            additionalTotal += line.amount;
          }
        });
      }

      filteredSummary.taxableBase = visibleTotal + additionalTotal;
      filteredSummary.vat = filteredSummary.taxableBase * (filteredSummary.vatPercentage / 100);
      filteredSummary.grandTotal = filteredSummary.taxableBase + filteredSummary.vat;
    }

    return {
      metadata: this.budgetMeta(),
      customer: this.selectedCustomer(),
      blocks: this.showTextBlocks() ? this.blocks() : [],
      materials: this.showMaterials() ? this.materials() : [],
      materialTables: this.showMaterials() ? this.materialTables() : [],
      countertop: this.showCountertop() ? this.countertopData() : null,
      summary: filteredSummary,
      materialsSectionTitle: this.materialsSectionTitle(),
      conditionsTitle: this.conditionsTitle(),
      conditions: this.showConditions() ? this.conditionsList() : [],
      companyLogoUrl: this.companyLogoUrl() || undefined,
      supplierLogoUrl: this.supplierLogoUrl() || undefined,
      generatedAt: new Date().toISOString()
    };
  }

  async updatePdfPreview() {
    // Cancel any pending update
    if (this.pdfUpdateDebounceTimer) {
      clearTimeout(this.pdfUpdateDebounceTimer);
    }

    // Debounce to avoid too frequent updates
    this.pdfUpdateDebounceTimer = setTimeout(async () => {
      await this.doUpdatePdfPreview();
    }, this.PDF_UPDATE_DEBOUNCE_MS);
  }

  private async doUpdatePdfPreview() {
    if (this.isPreviewLoading()) return;

    // Save current scroll/page before updating
    this.saveCurrentPdfState();

    this.isPreviewLoading.set(true);
    try {
      // Revoke old blob URL to prevent memory leaks
      if (this.currentPdfBlobUrl) {
        URL.revokeObjectURL(this.currentPdfBlobUrl);
      }

      const payload = this.buildPdfPayload();
      const { url: blobUrl, pageCount } = await this.pdfExport.getBudgetPdfBlobUrlWithPageCount(payload);
      this.currentPdfBlobUrl = blobUrl;
      this.totalPdfPages.set(pageCount);

      // Ensure current page doesn't exceed total pages
      const currentPage = this.currentPdfPage();
      if (currentPage > pageCount) {
        this.currentPdfPage.set(pageCount);
      }

      // Build URL with PDF open parameters for better scroll preservation
      // These parameters work in Chrome/Edge PDF viewer
      const params = [];
      const page = Math.min(this.currentPdfPage(), pageCount);
      if (page > 1) {
        params.push(`page=${page}`);
      }
      if (this.savedScrollTop > 0) {
        // scrollbar parameter and view parameter can help maintain position
        params.push(`scrollbar=1`);
        params.push(`view=FitH,${this.savedScrollTop}`);
      }

      const hashParams = params.length > 0 ? `#${params.join('&')}` : '';
      const urlWithParams = `${blobUrl}${hashParams}`;

      this.pdfPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(urlWithParams));
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
      this.budgetTitleInput.set(budget?.title ?? '');

      this.showTextBlocks.set(budget.showTextBlocks ?? true);
      this.showMaterials.set(budget.showMaterials ?? true);
      this.showCountertop.set(budget.showCountertop ?? false);
      this.showConditions.set(budget.showConditions ?? true);

      // Load materials section title
      this.materialsSectionTitle.set(budget.materialsSectionTitle ?? 'Materiales y equipamiento');

      // Load logo URLs
      this.companyLogoUrl.set(budget.companyLogoUrl ?? '');
      this.supplierLogoUrl.set(budget.supplierLogoUrl ?? '');

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

  protected async onMaterialsSectionTitleChanged(title: string): Promise<void> {
    this.materialsSectionTitle.set(title);

    const id = this.currentBudgetId();
    if (!id) return;

    try {
      await this.supabase.updateBudget(id, { materialsSectionTitle: title });
    } catch (error) {
      console.error('Error saving materials section title:', error);
    }
  }

  protected async onCompanyLogoUrlChanged(url: string): Promise<void> {
    this.companyLogoUrl.set(url);

    const id = this.currentBudgetId();
    if (!id) return;

    try {
      await this.supabase.updateBudget(id, { companyLogoUrl: url || null });
    } catch (error) {
      console.error('Error saving company logo URL:', error);
    }
  }

  protected async onSupplierLogoUrlChanged(url: string): Promise<void> {
    this.supplierLogoUrl.set(url);

    const id = this.currentBudgetId();
    if (!id) return;

    try {
      await this.supabase.updateBudget(id, { supplierLogoUrl: url || null });
    } catch (error) {
      console.error('Error saving supplier logo URL:', error);
    }
  }

  protected async onCompanyLogoFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingCompanyLogo.set(true);
    try {
      const result = await this.supabase.uploadPublicAsset(file, { folder: 'logos' });
      await this.onCompanyLogoUrlChanged(result.publicUrl);
    } catch (error) {
      console.error('Error uploading company logo:', error);
    } finally {
      this.uploadingCompanyLogo.set(false);
      input.value = ''; // Reset input for future uploads
    }
  }

  protected async onSupplierLogoFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingSupplierLogo.set(true);
    try {
      const result = await this.supabase.uploadPublicAsset(file, { folder: 'logos' });
      await this.onSupplierLogoUrlChanged(result.publicUrl);
    } catch (error) {
      console.error('Error uploading supplier logo:', error);
    } finally {
      this.uploadingSupplierLogo.set(false);
      input.value = ''; // Reset input for future uploads
    }
  }

  protected async clearCompanyLogo(): Promise<void> {
    await this.onCompanyLogoUrlChanged('');
  }

  protected async clearSupplierLogo(): Promise<void> {
    await this.onSupplierLogoUrlChanged('');
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
    this.queueBudgetTotalsPersist(summary);
  }

  protected onConditionsTitleChanged(title: string): void {
    this.conditionsTitle.set(title);
  }

  protected onConditionsChanged(conditions: Condition[]): void {
    this.conditionsList.set(conditions);
  }

  protected onBudgetTitleInput(value: string): void {
    this.budgetTitleInput.set(value);
  }

  protected onBudgetTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.persistBudgetTitle();
    }
  }

  protected onBudgetTitleBlur(): void {
    void this.persistBudgetTitle();
  }

  protected async toggleCompletionState(): Promise<void> {
    const id = this.currentBudgetId();
    if (!id || this.togglingStatus()) {
      return;
    }

    const nextStatus: BudgetStatus = this.isBudgetCompleted() ? 'not_completed' : 'completed';
    this.togglingStatus.set(true);

    try {
      const updated = await this.supabase.updateBudget(id, { status: nextStatus });
      const resolvedStatus = updated?.status ?? nextStatus;
      this.budgetMeta.update(meta => meta ? ({ ...meta, status: resolvedStatus }) : meta);
    } catch (error) {
      console.error('No se pudo actualizar el estado del presupuesto:', error);
    } finally {
      this.togglingStatus.set(false);
    }
  }

  private async persistBudgetTitle(): Promise<void> {
    const id = this.currentBudgetId();
    if (!id || this.savingBudgetTitle()) {
      return;
    }

    const newTitle = this.budgetTitleInput().trim();
    const normalized = newTitle.length ? newTitle : null;
    const currentTitle = this.budgetMeta()?.title ?? null;

    if ((currentTitle ?? null) === normalized) {
      if (newTitle !== (currentTitle ?? '')) {
        this.budgetTitleInput.set(currentTitle ?? '');
      }
      return;
    }

    this.savingBudgetTitle.set(true);
    try {
      const updated = await this.supabase.updateBudget(id, { title: normalized });
      const resolvedTitle = updated?.title ?? normalized ?? '';
      this.budgetMeta.update(meta => meta ? ({ ...meta, title: resolvedTitle || null }) : meta);
      this.budgetTitleInput.set(resolvedTitle ?? '');
    } catch (error) {
      console.error('No se pudo actualizar el título del presupuesto:', error);
    } finally {
      this.savingBudgetTitle.set(false);
    }
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

  private queueBudgetTotalsPersist(summary: BudgetSummary): void {
    this.pendingSummaryTotals = summary;

    if (!this.currentBudgetId()) {
      return;
    }

    if (this.summaryPersistenceTimer) {
      clearTimeout(this.summaryPersistenceTimer);
    }

    this.summaryPersistenceTimer = setTimeout(() => {
      void this.persistBudgetTotals();
    }, this.SUMMARY_PERSIST_DEBOUNCE_MS);
  }

  private async persistBudgetTotals(): Promise<void> {
    const summary = this.pendingSummaryTotals;
    const budgetId = this.currentBudgetId();
    this.summaryPersistenceTimer = null;

    if (!summary || !budgetId) {
      return;
    }

    try {
      await this.supabase.updateBudgetTotals(budgetId, summary);
    } catch (error) {
      console.error('No se pudieron actualizar los totales del presupuesto:', error);
    }
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

  ngOnDestroy(): void {
    if (this.customerSearchTimer) {
      clearTimeout(this.customerSearchTimer);
      this.customerSearchTimer = null;
    }

    if (this.summaryPersistenceTimer) {
      clearTimeout(this.summaryPersistenceTimer);
      this.summaryPersistenceTimer = null;
    }

    this.cleanupPdfBlobUrl();
  }

  /**
   * Registers the PDF iframe element for page tracking
   */
  registerPdfIframe(iframe: HTMLIFrameElement | null): void {
    this.pdfIframeElement = iframe;
  }

  /**
   * Called when user navigates to a different page in the PDF
   */
  onPdfPageChange(page: number): void {
    if (page > 0) {
      this.currentPdfPage.set(page);
    }
  }

  /**
   * Navigate to previous PDF page
   */
  goToPreviousPdfPage(): void {
    const current = this.currentPdfPage();
    if (current > 1) {
      this.currentPdfPage.set(current - 1);
      this.refreshPdfAtCurrentPage();
    }
  }

  /**
   * Navigate to next PDF page (limited by total pages)
   */
  goToNextPdfPage(): void {
    const current = this.currentPdfPage();
    const total = this.totalPdfPages();
    if (current < total) {
      this.currentPdfPage.set(current + 1);
      this.refreshPdfAtCurrentPage();
    }
  }

  /**
   * Refresh the PDF preview at the current page
   */
  private refreshPdfAtCurrentPage(): void {
    if (!this.currentPdfBlobUrl) return;

    const page = Math.min(this.currentPdfPage(), this.totalPdfPages());
    const urlWithPage = `${this.currentPdfBlobUrl}#page=${page}`;
    this.pdfPreviewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(urlWithPage));
  }

  /**
   * Saves the current PDF state (page and scroll position) from the iframe
   */
  private saveCurrentPdfState(): void {
    if (!this.pdfIframeElement) {
      return;
    }

    try {
      // Try to get current page from the iframe's current URL hash
      const currentSrc = this.pdfIframeElement.src || '';
      const pageMatch = currentSrc.match(/#.*?page=(\d+)/);
      if (pageMatch) {
        this.currentPdfPage.set(parseInt(pageMatch[1], 10));
      }

      // Try to get scroll position from view parameter
      const viewMatch = currentSrc.match(/view=FitH,(\d+)/);
      if (viewMatch) {
        this.savedScrollTop = parseInt(viewMatch[1], 10);
      }

      // Also try to read from iframe's contentWindow if accessible
      try {
        if (this.pdfIframeElement.contentWindow) {
          const scrollY = this.pdfIframeElement.contentWindow.scrollY;
          if (scrollY > 0) {
            this.savedScrollTop = scrollY;
          }
        }
      } catch {
        // Cross-origin - ignore
      }
    } catch (error) {
      console.debug('Could not save PDF state:', error);
    }
  }

  /**
   * Clean up blob URLs on destroy to prevent memory leaks
   */
  private cleanupPdfBlobUrl(): void {
    if (this.currentPdfBlobUrl) {
      URL.revokeObjectURL(this.currentPdfBlobUrl);
      this.currentPdfBlobUrl = null;
    }

    if (this.pdfUpdateDebounceTimer) {
      clearTimeout(this.pdfUpdateDebounceTimer);
      this.pdfUpdateDebounceTimer = null;
    }
  }
}
