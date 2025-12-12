import { Component, signal, inject, effect, computed, untracked, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog } from '@angular/material/dialog';
import { CompositeBlocksComponent } from '../sections/composite-blocks/composite-blocks.component';
import { ItemTableComponent } from '../sections/item-tables/item-table.component';
import { BudgetSummaryComponent } from '../sections/summary/budget-summary.component';
import { GeneralConditionsComponent } from '../sections/conditions/general-conditions.component';
import { CustomerSelectorComponent } from '../../customers/components/customer-selector.component';
import { SendEmailDialogComponent } from './send-email-dialog.component';
import { CompositeBlock } from '../../../models/composite-block.model';
import { ItemRow, ItemTable } from '../../../models/item-table.model';
import { Customer } from '../../../models/customer.model';
import { BudgetSummary, SummaryLine } from '../../../models/budget-summary.model';
import { Condition } from '../../../models/conditions.model';
import { BudgetSection, DEFAULT_SECTION_ORDER, migrateSectionOrder } from '../../../models/budget-section.model';
import { EmailLog, SendEmailDialogData, SendEmailDialogResult } from '../../../models/email-log.model';
import { SupabaseService } from '../../../services/supabase.service';
import { PdfExportService, BudgetPdfPayload, BudgetPdfMetadata } from '../../../services/pdf-export.service';
import { NotificationService } from '../../../services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SimpleBlockEditorComponent } from '../sections/simple-block/simple-block-editor.component';
import { SimpleBlock } from '../../../models/simple-block.model';
import { BudgetStatus } from '../../../models/budget.model';
import { environment } from '../../../../environments/environment';
import { SupplierSelectionDialogComponent, SupplierSelectionDialogData } from '../../supplier-orders/components/supplier-selection-dialog.component';

@Component({
  selector: 'app-budget-editor',
  imports: [
    DragDropModule,
    CustomerSelectorComponent,
    CompositeBlocksComponent,
    ItemTableComponent,
    SimpleBlockEditorComponent,
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
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly routeParams = toSignal(this.route.paramMap);

  @ViewChild('pdfIframe') pdfIframeRef!: ElementRef<HTMLIFrameElement>;

  // Budget ID - will be initialized on component creation
  protected readonly currentBudgetId = signal<number | null>(null);
  protected readonly isInitialized = signal<boolean>(false);

  // Totals from each section
  protected readonly totalBlocks = signal<number>(0);
  protected readonly totalItems = signal<number>(0);
  protected readonly totalSimpleBlock = signal<number>(0);

  // Data arrays
  protected readonly blocks = signal<CompositeBlock[]>([]);
  protected readonly blocksSectionTitle = signal<string>('Bloque Compuesto');
  protected readonly items = signal<ItemRow[]>([]);
  protected readonly itemTables = signal<ItemTable[]>([]);
  protected readonly itemTablesSectionTitle = signal<string>('Materiales y equipamiento');
  protected readonly customers = signal<Customer[]>([]);
  protected readonly customerSearchTerm = signal<string>('');
  protected readonly customersLoading = signal<boolean>(false);
  protected readonly updatingCustomer = signal<boolean>(false);
  protected readonly customerError = signal<string | null>(null);
  protected readonly selectedCustomerId = signal<number | null>(null);
  private readonly cachedSelectedCustomer = signal<Customer | null>(null);
  protected readonly budgetMeta = signal<BudgetPdfMetadata | null>(null);
  protected readonly summarySnapshot = signal<BudgetSummary | null>(null);
  protected readonly additionalLines = signal<SummaryLine[]>([]);
  protected readonly conditionsTitle = signal<string>('Condiciones generales');
  protected readonly conditionsList = signal<Condition[]>([]);
  protected readonly pdfGenerating = signal<boolean>(false);
  protected readonly simpleBlockData = signal<SimpleBlock | null>(null);
  protected readonly budgetTitleInput = signal<string>('');
  protected readonly savingBudgetTitle = signal<boolean>(false);

  // Logo URLs
  private readonly DEFAULT_COMPANY_LOGO = environment.defaultCompanyLogoUrl;
  protected readonly companyLogoUrl = signal<string>(this.DEFAULT_COMPANY_LOGO);
  protected readonly supplierLogoUrl = signal<string>('');
  protected readonly uploadingCompanyLogo = signal<boolean>(false);
  protected readonly uploadingSupplierLogo = signal<boolean>(false);

  // Visibility signals
  protected readonly showCompositeBlocks = signal<boolean>(false);
  protected readonly showItemTables = signal<boolean>(false);
  protected readonly showSimpleBlock = signal<boolean>(false);
  protected readonly showConditions = signal<boolean>(false);
  protected readonly showSummary = signal<boolean>(false);
  protected readonly showSignature = signal<boolean>(false);
  protected readonly sectionOrder = signal<BudgetSection[]>([...DEFAULT_SECTION_ORDER]);
  protected readonly togglingStatus = signal<boolean>(false);

  // Expose BudgetSection enum to template
  protected readonly BudgetSection = BudgetSection;

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

  // Print options signals
  protected readonly printCompositeBlocks = signal<boolean>(true);
  protected readonly printItemTables = signal<boolean>(true);
  protected readonly printSimpleBlock = signal<boolean>(true);
  protected readonly printConditions = signal<boolean>(true);
  protected readonly printSummary = signal<boolean>(true);

  protected readonly selectedCustomer = computed(() => this.cachedSelectedCustomer());
  protected readonly isBudgetCompleted = computed(() => (this.budgetMeta()?.status ?? '') === 'completed');
  protected readonly completionStateLabel = computed(() => this.isBudgetCompleted() ? 'Completado' : 'No completado');
  protected readonly completionStateIcon = computed(() => this.isBudgetCompleted() ? 'task_alt' : 'hourglass_top');
  protected readonly completionActionLabel = computed(() => this.isBudgetCompleted() ? 'Marcar como no completado' : 'Marcar como completado');
  protected readonly completionActionIcon = computed(() => this.isBudgetCompleted() ? 'undo' : 'check_circle');

  private customerSearchTimer: ReturnType<typeof setTimeout> | null = null;
  private latestCustomerSearchId = 0;
  private summaryPersistenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSummaryTotals: BudgetSummary | null = null;
  private additionalLinesPersistenceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingAdditionalLines: SummaryLine[] | null = null;
  private readonly SUMMARY_PERSIST_DEBOUNCE_MS = 500;

  constructor() {
    effect(() => {
      const idParam = this.routeParams()?.get('id');
      if (!idParam) {
        this.isInitialized.set(false);
        return;
      }

      const id = Number(idParam);
      if (!Number.isFinite(id) || id <= 0) {
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
        this.items();
        this.itemTables();
        this.itemTablesSectionTitle();
        this.simpleBlockData();
        this.summarySnapshot();
        this.conditionsList();
        this.selectedCustomer();
        this.showCompositeBlocks();
        this.showItemTables();
        this.showSimpleBlock();
        this.showConditions();
        this.showSummary();
        this.showSignature();
        this.printCompositeBlocks();
        this.printItemTables();
        this.printSimpleBlock();
        this.printConditions();
        this.printSummary();
        this.budgetMeta();
        this.conditionsTitle();
        this.sectionOrder();

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
      totalBlocks: this.showCompositeBlocks() ? originalSummary.totalBlocks : 0,
      totalItems: this.showItemTables() ? originalSummary.totalItems : 0,
      totalSimpleBlock: this.showSimpleBlock() ? originalSummary.totalSimpleBlock : 0
    } : null;

    // Recalcular taxableBase y grandTotal basado en secciones visibles
    if (filteredSummary) {
      const visibleTotal = filteredSummary.totalBlocks + filteredSummary.totalItems + (filteredSummary.totalSimpleBlock ?? 0);

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
      blocks: this.showCompositeBlocks() ? this.blocks() : [],
      items: this.showItemTables() ? this.items() : [],
      itemTables: this.showItemTables() ? this.itemTables() : [],
      simpleBlock: this.showSimpleBlock() ? this.simpleBlockData() : null,
      summary: this.showSummary() ? filteredSummary : null,
      itemsSectionTitle: this.itemTablesSectionTitle(),
      conditionsTitle: this.conditionsTitle(),
      sectionOrder: this.sectionOrder(),
      conditions: this.showConditions() ? this.conditionsList() : [],
      companyLogoUrl: this.companyLogoUrl() || undefined,
      supplierLogoUrl: this.supplierLogoUrl() || undefined,
      showSignature: this.showSignature(),
      printCompositeBlocks: this.printCompositeBlocks(),
      printItemTables: this.printItemTables(),
      printSimpleBlock: this.printSimpleBlock(),
      printConditions: this.printConditions(),
      printSummary: this.printSummary(),
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

  drop(event: CdkDragDrop<BudgetSection[]>) {
    const newOrder = [...this.sectionOrder()];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);
    this.sectionOrder.set(newOrder);
    this.saveSectionOrder(newOrder);
  }

  private async saveSectionOrder(order: BudgetSection[]) {
    const id = this.currentBudgetId();
    if (!id) return;
    try {
      await this.supabase.updateBudget(id, { sectionOrder: order });
    } catch (error) {
      console.error('Error saving section order:', error);
    }
  }

  private async loadBudget(id: number): Promise<void> {
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

      this.showCompositeBlocks.set(budget.showCompositeBlocks ?? false);
      this.showItemTables.set(budget.showItemTables ?? false);
      this.showSimpleBlock.set(budget.showSimpleBlock ?? false);
      this.showConditions.set(budget.showConditions ?? false);
      this.showSummary.set(budget.showSummary ?? false);
      this.showSignature.set(budget.showSignature ?? false);

      //TODO remove legacy section order handling
      if (budget.sectionOrder && budget.sectionOrder.length > 0) {
        // Migrate legacy keys using the centralized mapping
        const migratedOrder = migrateSectionOrder(budget.sectionOrder);
        this.sectionOrder.set(migratedOrder);
      }

      // Load items section title
      this.itemTablesSectionTitle.set(budget.itemTablesSectionTitle ?? 'Materiales y equipamiento');

      // Load logo URLs (use default company logo if not set)
      this.companyLogoUrl.set(budget.companyLogoUrl || this.DEFAULT_COMPANY_LOGO);
      this.supplierLogoUrl.set(budget.supplierLogoUrl ?? '');

      const relationalTables = Array.isArray(budget.itemTables) ? budget.itemTables : [];
      this.itemTables.set(relationalTables);
      this.items.set(this.flattenItems(relationalTables));
      this.totalItems.set(this.calculateItemsTotal(relationalTables));

      const customerId = budget?.customer?.id ?? budget?.customerId ?? null;
      this.selectedCustomerId.set(customerId);
  this.cachedSelectedCustomer.set((budget?.customer as Customer | null | undefined) ?? null);

      // Additional lines (discounts, extras, etc.) — pass them to the summary component
      this.additionalLines.set(budget.additionalLines ?? []);

      // Load conditions
      this.conditionsList.set(budget.conditions ?? []);

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

  protected async onCustomerSelected(customerId: number | null): Promise<void> {
    const currentBudgetId = this.currentBudgetId();
    if (currentBudgetId == null) {
      return;
    }

    if (this.selectedCustomerId() === customerId) {
      return;
    }

    this.updatingCustomer.set(true);
    this.customerError.set(null);

    try {
      await this.supabase.updateBudget(currentBudgetId, { customerId });
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
   * Updates the items total
   */
  protected onTotalItemsChanged(total: number): void {
    this.totalItems.set(total);
  }

  protected async onItemTablesSectionTitleChanged(title: string): Promise<void> {
    this.itemTablesSectionTitle.set(title);

    const id = this.currentBudgetId();
    if (!id) return;

    try {
      await this.supabase.updateBudget(id, { itemTablesSectionTitle: title });
    } catch (error) {
      console.error('Error saving items section title:', error);
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

  protected onTotalSimpleBlockChanged(total: number) {
    this.totalSimpleBlock.set(total);
  }

  protected onSimpleBlockChanged(simpleBlock: SimpleBlock | null) {
    this.simpleBlockData.set(simpleBlock);
    // If we receive data (even if empty but loaded), we might want to show it.
    // But specifically, if it has content, we definitely show it.
    // If it's null (deleted), we hide it.
    if (simpleBlock === null) {
      this.showSimpleBlock.set(false);
    } else if (simpleBlock.model || simpleBlock.price > 0 || simpleBlock.imageUrl) {
      this.showSimpleBlock.set(true);
    }
  }

  protected onSimpleBlockDeleted() {
    this.showSimpleBlock.set(false);
    this.simpleBlockData.set(null);
    this.totalSimpleBlock.set(0);
  }

  toggleSimpleBlock() {
    this.showSimpleBlock.update((v: boolean) => !v);
  }

  /**
   * Updates the blocks
   */
  protected onBlocksChanged(blocks: CompositeBlock[]): void {
    this.blocks.set(blocks);
  }

  /**
   * Updates the items
   */
  protected onItemsChanged(items: ItemRow[]): void {
    this.items.set(items);
  }

  protected async onTablesChanged(tables: ItemTable[]): Promise<void> {
    this.itemTables.set(tables);

    const id = this.currentBudgetId();
    if (id) {
      try {
        const result = await this.supabase.saveItemTables(id, tables);
        // If result contains inserted data, map it back to the UI
        if (result && result.tables && result.rows) {
          const insertedTables = result.tables as any[];
          const insertedRows = result.rows as any[];
          const updatedTables = insertedTables.map(t => ({
            id: t.id,
            budgetId: t.budgetId,
            orderIndex: t.orderIndex,
            title: t.title,
            showReference: t.showReference ?? true,
            showDescription: t.showDescription ?? true,
            showManufacturer: t.showManufacturer ?? true,
            showQuantity: t.showQuantity ?? true,
            showUnitPrice: t.showUnitPrice ?? true,
            showTotalPrice: t.showTotalPrice ?? true,
            rows: (insertedRows.filter(r => r.tableId === t.id) || []).map(r => ({
              id: r.id,
              tableId: r.tableId,
              productId: r.productId,
              orderIndex: r.orderIndex,
              reference: r.reference,
              description: r.description,
              manufacturer: r.manufacturer,
              quantity: Number(r.quantity ?? 0),
              unitPrice: Number(r.unitPrice ?? 0),
              totalPrice: Number(r.totalPrice ?? 0)
            }))
          } as ItemTable));

          this.itemTables.set(updatedTables);
          // Also update flattened items list
          this.items.set(updatedTables.flatMap(t => t.rows ?? []));
        }
      } catch (error) {
        console.error('Error saving item tables:', error);
      }
    }
  }

  protected onSummaryChanged(summary: BudgetSummary): void {
    this.summarySnapshot.set(summary);
    this.queueBudgetTotalsPersist(summary);
    // Keep the local copy and schedule persistence of additional lines
    this.additionalLines.set(summary.additionalLines ?? []);
    this.queueAdditionalLinesPersist(summary.additionalLines ?? []);
  }

  private queueAdditionalLinesPersist(lines: SummaryLine[]): void {
    this.pendingAdditionalLines = lines ?? [];

    if (this.currentBudgetId() == null) {
      return;
    }

    if (this.additionalLinesPersistenceTimer) {
      clearTimeout(this.additionalLinesPersistenceTimer);
    }

    this.additionalLinesPersistenceTimer = setTimeout(() => {
      void this.persistAdditionalLines();
    }, this.SUMMARY_PERSIST_DEBOUNCE_MS);
  }

  private async persistAdditionalLines(): Promise<void> {
    const lines = this.pendingAdditionalLines;
    const budgetId = this.currentBudgetId();
    this.additionalLinesPersistenceTimer = null;

    if (!budgetId) {
      return;
    }

    try {
      await this.supabase.saveAdditionalLines(budgetId, lines ?? []);
    } catch (error) {
      console.error('No se pudieron actualizar las líneas adicionales del presupuesto:', error);
    }
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
    if (this.currentBudgetId() == null || this.pdfGenerating()) {
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
    if (this.currentBudgetId() == null || this.pdfGenerating()) {
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

  private flattenItems(tables: ItemTable[]): ItemRow[] {
    return tables.flatMap(table =>
      (table.rows ?? []).map((row, rowIndex) => ({
        ...row,
        tableId: row.tableId ?? table.id,
        orderIndex: row.orderIndex ?? rowIndex
      }))
    );
  }

  private calculateItemsTotal(tables: ItemTable[]): number {
    return tables.reduce((tableSum, table) =>
      tableSum + (table.rows ?? []).reduce((rowSum, row) => rowSum + (row.totalPrice ?? 0), 0),
    0);
  }

  private queueBudgetTotalsPersist(summary: BudgetSummary): void {
    this.pendingSummaryTotals = summary;

    if (this.currentBudgetId() == null) {
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

  async toggleSection(section: BudgetSection) {
    const id = this.currentBudgetId();
    if (!id) return;

    let updates: any = {};
    switch (section) {
      case BudgetSection.CompositeBlocks:
        const newCompositeBlocks = !this.showCompositeBlocks();
        this.showCompositeBlocks.set(newCompositeBlocks);
        updates = { showCompositeBlocks: newCompositeBlocks };
        break;
      case BudgetSection.ItemTables:
        const newItemTables = !this.showItemTables();
        this.showItemTables.set(newItemTables);
        updates = { showItemTables: newItemTables };
        break;
      case BudgetSection.SimpleBlock:
        const newSimpleBlock = !this.showSimpleBlock();
        this.showSimpleBlock.set(newSimpleBlock);
        updates = { showSimpleBlock: newSimpleBlock };
        break;
      case BudgetSection.Conditions:
        const newConditions = !this.showConditions();
        this.showConditions.set(newConditions);
        updates = { showConditions: newConditions };
        break;
      case BudgetSection.Summary:
        const newSummary = !this.showSummary();
        this.showSummary.set(newSummary);
        updates = { showSummary: newSummary };
        break;
      case BudgetSection.Signature:
        const newSignature = !this.showSignature();
        this.showSignature.set(newSignature);
        updates = { showSignature: newSignature };
        break;
    }

    try {
      await this.supabase.updateBudget(id, updates);
    } catch (error) {
      console.error('Error updating section visibility:', error);
    }
  }

  togglePrintOption(option: BudgetSection) {
    switch (option) {
      case BudgetSection.CompositeBlocks:
        this.printCompositeBlocks.update((v: boolean) => !v);
        break;
      case BudgetSection.ItemTables:
        this.printItemTables.update((v: boolean) => !v);
        break;
      case BudgetSection.SimpleBlock:
        this.printSimpleBlock.update((v: boolean) => !v);
        break;
      case BudgetSection.Conditions:
        this.printConditions.update((v: boolean) => !v);
        break;
      case BudgetSection.Summary:
        this.printSummary.update((v: boolean) => !v);
        break;
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
    if (this.additionalLinesPersistenceTimer) {
      clearTimeout(this.additionalLinesPersistenceTimer);
      this.additionalLinesPersistenceTimer = null;
    }
    // Try to persist any pending additional lines before destroying (fire-and-forget)
    if (this.pendingAdditionalLines && this.pendingAdditionalLines.length > 0 && this.currentBudgetId()) {
      void this.persistAdditionalLines();
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

  // ============================================
  // TAB NAVIGATION
  // ============================================



  // ============================================
  // EMAIL FUNCTIONALITY
  // ============================================

  /**
   * Opens the send email dialog with optional prefill data for retries
   */
  openSendEmailDialog(prefillData?: { email: string; subject: string; bodyText: string }): void {
    const budgetId = this.currentBudgetId();
    if (!budgetId) {
      this.notification.showError('No se puede enviar el email sin un presupuesto válido');
      return;
    }

    const meta = this.budgetMeta();
    const customer = this.selectedCustomer();

    const dialogData: SendEmailDialogData & { pdfPayload: BudgetPdfPayload } = {
      customerEmail: customer?.email,
      customerName: customer?.name,
      budgetNumber: meta?.budgetNumber || `#${budgetId}`,
      budgetTitle: meta?.title || '',
      budgetId,
      prefillData,
      pdfPayload: this.buildPdfPayload()
    };

    const dialogRef = this.dialog.open(SendEmailDialogComponent, {
      data: dialogData,
      disableClose: true,
      panelClass: 'send-email-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result: SendEmailDialogResult | undefined) => {
      if (result?.success) {
        this.notification.showSuccess('Email enviado correctamente');
      } else if (result && !result.success && result.error) {
        this.notification.showError(result.error);
      }
    });
  }

  /**
   * Opens the supplier selection dialog to create orders from selected item rows
   */
  onCreateOrderRequested(selectedRows: ItemRow[]): void {
    const budgetId = this.currentBudgetId();
    if (!budgetId) {
      this.notification.showError('No se puede crear pedido sin un presupuesto válido');
      return;
    }

    if (selectedRows.length === 0) {
      this.notification.showError('No hay productos seleccionados para crear pedido');
      return;
    }

    const dialogData: SupplierSelectionDialogData = {
      selectedRows,
      budgetId
    };

    this.dialog.open(SupplierSelectionDialogComponent, {
      data: dialogData,
      disableClose: true,
      panelClass: 'supplier-selection-dialog-panel',
      width: '700px',
      maxHeight: '90vh'
    });
  }
}

