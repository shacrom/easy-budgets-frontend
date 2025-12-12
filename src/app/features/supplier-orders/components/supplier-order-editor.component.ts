import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SupabaseService } from '../../../services/supabase.service';
import { NotificationService } from '../../../services/notification.service';
import { SupplierOrderPdfService } from '../../../services/supplier-order-pdf.service';
import { SupplierOrder, SupplierOrderStatus } from '../../../models/supplier-order.model';
import { SupplierOrderItem } from '../../../models/supplier-order-item.model';
import { Supplier } from '../../../models/supplier.model';
import { DeliveryAddress } from '../../../models/delivery-address.model';

@Component({
  selector: 'app-supplier-order-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="container">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <a routerLink="/supplier-orders" class="back-link">
            <span class="material-icons">arrow_back</span>
          </a>
          <div class="header-info">
            <h1>{{ order()?.orderNumber || 'Nuevo pedido' }}</h1>
            @if (order()) {
              <span class="status-badge" [class]="'status-' + order()?.status">
                <span class="material-icons">{{ getStatusIcon(order()?.status || 'draft') }}</span>
                {{ getStatusLabel(order()?.status || 'draft') }}
              </span>
            }
          </div>
        </div>
        <div class="header-actions">
          @if (order()?.status === 'draft') {
            <button class="btn btn-primary" (click)="sendOrder()" [disabled]="isSending()">
              <span class="material-icons">{{ isSending() ? 'sync' : 'send' }}</span>
              {{ isSending() ? 'Enviando...' : 'Enviar pedido' }}
            </button>
          }
          @if (order()?.status === 'sent') {
            <button class="btn btn-success" (click)="markAsDelivered()" [disabled]="isUpdating()">
              <span class="material-icons">check_circle</span>
              Marcar como entregado
            </button>
          }
          <button class="btn btn-outline" (click)="downloadPdf()" [disabled]="isGeneratingPdf()">
            <span class="material-icons">{{ isGeneratingPdf() ? 'sync' : 'download' }}</span>
            Descargar PDF
          </button>
        </div>
      </header>

      @if (isLoading()) {
        <div class="loading-container">
          <span class="material-icons spinning">sync</span>
          <p>Cargando pedido...</p>
        </div>
      } @else if (!order()) {
        <div class="error-container">
          <span class="material-icons">error</span>
          <h3>Pedido no encontrado</h3>
          <a routerLink="/supplier-orders" class="btn btn-primary">Volver a la lista</a>
        </div>
      } @else {
        <div class="editor-grid">
          <!-- Main content -->
          <main class="main-content">
            <!-- Supplier info -->
            <section class="card">
              <h2>
                <span class="material-icons">store</span>
                Proveedor
              </h2>
              <div class="supplier-info">
                @if (supplier()) {
                  <div class="info-row">
                    <span class="label">Nombre:</span>
                    <span class="value">{{ supplier()?.name }}</span>
                  </div>
                  @if (supplier()?.contactName) {
                    <div class="info-row">
                      <span class="label">Contacto:</span>
                      <span class="value">{{ supplier()?.contactName }}</span>
                    </div>
                  }
                  @if (supplier()?.email) {
                    <div class="info-row">
                      <span class="label">Email:</span>
                      <span class="value">
                        <a [href]="'mailto:' + supplier()?.email">{{ supplier()?.email }}</a>
                      </span>
                    </div>
                  }
                  @if (supplier()?.phone) {
                    <div class="info-row">
                      <span class="label">Teléfono:</span>
                      <span class="value">{{ supplier()?.phone }}</span>
                    </div>
                  }
                } @else {
                  <p class="no-supplier">No se ha encontrado información del proveedor</p>
                }
              </div>
            </section>

            <!-- Products -->
            <section class="card">
              <h2>
                <span class="material-icons">inventory_2</span>
                Productos ({{ items().length }})
              </h2>
              @if (items().length === 0) {
                <div class="empty-products">
                  <span class="material-icons">inbox</span>
                  <p>No hay productos en este pedido</p>
                </div>
              } @else {
                <div class="products-table-container">
                  <table class="products-table">
                    <thead>
                      <tr>
                        <th class="col-concept">Concepto</th>
                        <th class="col-qty">Cant.</th>
                        <th class="col-unit">Unidad</th>
                        <th class="col-price">Precio</th>
                        <th class="col-total">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of items(); track item.id) {
                        <tr>
                          <td class="col-concept">
                            <div class="concept-cell">
                              <span class="concept-name">{{ item.concept }}</span>
                              @if (item.description) {
                                <span class="concept-desc">{{ item.description }}</span>
                              }
                            </div>
                          </td>
                          <td class="col-qty">{{ item.quantity }}</td>
                          <td class="col-unit">{{ item.unit || 'ud' }}</td>
                          <td class="col-price">{{ item.unitPrice | number:'1.2-2' }} €</td>
                          <td class="col-total">{{ item.totalPrice | number:'1.2-2' }} €</td>
                        </tr>
                      }
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="4" class="total-label">Total pedido:</td>
                        <td class="total-value">{{ order()?.totalAmount | number:'1.2-2' }} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              }
            </section>
          </main>

          <!-- Sidebar -->
          <aside class="sidebar">
            <!-- Delivery address -->
            <section class="card">
              <h2>
                <span class="material-icons">location_on</span>
                Dirección de entrega
              </h2>
              @if (order()?.status === 'draft') {
                <div class="form-group">
                  <select [ngModel]="order()?.deliveryAddressId"
                          (ngModelChange)="onDeliveryAddressChange($event)">
                    <option [ngValue]="null">Sin dirección</option>
                    @for (addr of deliveryAddresses(); track addr.id) {
                      <option [ngValue]="addr.id">{{ addr.name }}</option>
                    }
                  </select>
                </div>
              }
              @if (selectedAddress()) {
                <div class="address-preview">
                  <p class="address-name">{{ selectedAddress()?.name }}</p>
                  <p class="address-line">{{ selectedAddress()?.address }}</p>
                  @if (selectedAddress()?.city || selectedAddress()?.postalCode) {
                    <p class="address-line">
                      {{ selectedAddress()?.postalCode }} {{ selectedAddress()?.city }}
                    </p>
                  }
                  @if (selectedAddress()?.province) {
                    <p class="address-line">{{ selectedAddress()?.province }}</p>
                  }
                  @if (selectedAddress()?.contactName || selectedAddress()?.contactPhone) {
                    <p class="address-contact">
                      {{ selectedAddress()?.contactName }}
                      @if (selectedAddress()?.contactPhone) {
                        · {{ selectedAddress()?.contactPhone }}
                      }
                    </p>
                  }
                </div>
              } @else {
                <p class="no-address">No se ha seleccionado dirección de entrega</p>
              }
            </section>

            <!-- Notes -->
            <section class="card">
              <h2>
                <span class="material-icons">notes</span>
                Notas
              </h2>
              @if (order()?.status === 'draft') {
                <textarea
                  [ngModel]="order()?.notes"
                  (ngModelChange)="onNotesChange($event)"
                  placeholder="Añade notas o instrucciones especiales..."
                  rows="4">
                </textarea>
              } @else if (order()?.notes) {
                <p class="notes-preview">{{ order()?.notes }}</p>
              } @else {
                <p class="no-notes">Sin notas</p>
              }
            </section>

            <!-- Customer reference -->
            <section class="card">
              <h2>
                <span class="material-icons">tag</span>
                Referencia cliente
              </h2>
              @if (order()?.status === 'draft') {
                <input type="text"
                       [ngModel]="order()?.customerReference"
                       (ngModelChange)="onCustomerReferenceChange($event)"
                       placeholder="Referencia opcional...">
              } @else if (order()?.customerReference) {
                <p class="reference-preview">{{ order()?.customerReference }}</p>
              } @else {
                <p class="no-reference">Sin referencia</p>
              }
            </section>

            <!-- Related budget -->
            @if (order()?.budgetId) {
              <section class="card">
                <h2>
                  <span class="material-icons">description</span>
                  Presupuesto relacionado
                </h2>
                <a [routerLink]="['/budgets', order()?.budgetId]" class="budget-link">
                  <span class="material-icons">open_in_new</span>
                  Ver presupuesto #{{ order()?.budgetId }}
                </a>
              </section>
            }

            <!-- History -->
            <section class="card">
              <h2>
                <span class="material-icons">history</span>
                Historial
              </h2>
              <div class="history-list">
                <div class="history-item">
                  <span class="material-icons">add_circle</span>
                  <div class="history-content">
                    <span class="history-action">Creado</span>
                    <span class="history-date">{{ order()?.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                </div>
                @if (order()?.sentAt) {
                  <div class="history-item">
                    <span class="material-icons">send</span>
                    <div class="history-content">
                      <span class="history-action">Enviado</span>
                      <span class="history-date">{{ order()?.sentAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                }
                @if (order()?.deliveredAt) {
                  <div class="history-item">
                    <span class="material-icons">check_circle</span>
                    <div class="history-content">
                      <span class="history-action">Entregado</span>
                      <span class="history-date">{{ order()?.deliveredAt | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                  </div>
                }
              </div>
            </section>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: white;
      border: 1px solid #e5e7eb;
      color: #6b7280;
      text-decoration: none;
      transition: all 0.2s;
    }

    .back-link:hover {
      background: #f9fafb;
      color: #374151;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-info h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #1a1a2e;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 0.875rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
    }

    .btn-outline {
      background: white;
      border: 1px solid #e5e7eb;
      color: #374151;
    }

    .btn-outline:hover:not(:disabled) {
      background: #f9fafb;
    }

    .btn .material-icons {
      font-size: 1.125rem;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Status badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge .material-icons {
      font-size: 0.875rem;
    }

    .status-draft {
      background: #fef3c7;
      color: #92400e;
    }

    .status-sent {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-delivered {
      background: #d1fae5;
      color: #065f46;
    }

    /* Loading/Error states */
    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .loading-container .material-icons,
    .error-container .material-icons {
      font-size: 3rem;
      color: #9ca3af;
      margin-bottom: 1rem;
    }

    .error-container h3 {
      margin: 0 0 1.5rem;
      color: #374151;
    }

    /* Grid layout */
    .editor-grid {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 1.5rem;
    }

    /* Cards */
    .card {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .card:last-child {
      margin-bottom: 0;
    }

    .card h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    }

    .card h2 .material-icons {
      font-size: 1.25rem;
      color: #6b7280;
    }

    /* Supplier info */
    .supplier-info .info-row {
      display: flex;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .supplier-info .info-row:last-child {
      border-bottom: none;
    }

    .supplier-info .label {
      flex: 0 0 100px;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .supplier-info .value {
      flex: 1;
      font-size: 0.875rem;
      color: #1a1a2e;
    }

    .supplier-info .value a {
      color: #3b82f6;
      text-decoration: none;
    }

    .supplier-info .value a:hover {
      text-decoration: underline;
    }

    .no-supplier {
      color: #9ca3af;
      font-size: 0.875rem;
      text-align: center;
      padding: 1rem;
    }

    /* Products table */
    .products-table-container {
      overflow-x: auto;
    }

    .products-table {
      width: 100%;
      border-collapse: collapse;
    }

    .products-table th,
    .products-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .products-table th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    .products-table tbody tr:hover {
      background: #f9fafb;
    }

    .col-concept { width: 40%; }
    .col-qty { width: 10%; text-align: center; }
    .col-unit { width: 15%; }
    .col-price { width: 15%; text-align: right; }
    .col-total { width: 20%; text-align: right; }

    .products-table td.col-qty { text-align: center; }
    .products-table td.col-price,
    .products-table td.col-total { text-align: right; font-variant-numeric: tabular-nums; }

    .concept-cell {
      display: flex;
      flex-direction: column;
    }

    .concept-name {
      font-weight: 500;
      color: #1a1a2e;
    }

    .concept-desc {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .products-table tfoot td {
      border-top: 2px solid #e5e7eb;
      border-bottom: none;
    }

    .total-label {
      text-align: right;
      font-weight: 600;
      color: #374151;
    }

    .total-value {
      text-align: right;
      font-weight: 700;
      font-size: 1.125rem;
      color: #1a1a2e;
      font-variant-numeric: tabular-nums;
    }

    .empty-products {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      color: #9ca3af;
    }

    .empty-products .material-icons {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    /* Sidebar forms */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-group select,
    .sidebar input,
    .sidebar textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .sidebar textarea {
      resize: vertical;
      min-height: 80px;
    }

    .sidebar select:focus,
    .sidebar input:focus,
    .sidebar textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    /* Address preview */
    .address-preview {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .address-preview p {
      margin: 0 0 0.25rem;
    }

    .address-name {
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 0.5rem !important;
    }

    .address-line {
      color: #6b7280;
    }

    .address-contact {
      margin-top: 0.75rem !important;
      padding-top: 0.75rem;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
    }

    .no-address,
    .no-notes,
    .no-reference {
      color: #9ca3af;
      font-size: 0.875rem;
      font-style: italic;
    }

    .notes-preview,
    .reference-preview {
      font-size: 0.875rem;
      color: #374151;
      margin: 0;
    }

    /* Budget link */
    .budget-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #3b82f6;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .budget-link:hover {
      text-decoration: underline;
    }

    .budget-link .material-icons {
      font-size: 1rem;
    }

    /* History */
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .history-item .material-icons {
      font-size: 1.125rem;
      color: #9ca3af;
    }

    .history-content {
      display: flex;
      flex-direction: column;
    }

    .history-action {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    .history-date {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .editor-grid {
        grid-template-columns: 1fr;
      }

      .sidebar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .sidebar .card {
        margin-bottom: 0;
      }
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-info {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .header-actions {
        width: 100%;
        flex-wrap: wrap;
      }

      .header-actions .btn {
        flex: 1;
        justify-content: center;
      }
    }
  `]
})
export class SupplierOrderEditorComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly notification = inject(NotificationService);
  private readonly pdfService = inject(SupplierOrderPdfService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly routeParams = toSignal(this.route.paramMap);
  private readonly queryParams = toSignal(this.route.queryParamMap);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly isSending = signal<boolean>(false);
  protected readonly isUpdating = signal<boolean>(false);
  protected readonly isGeneratingPdf = signal<boolean>(false);

  protected readonly order = signal<SupplierOrder | null>(null);
  protected readonly items = signal<SupplierOrderItem[]>([]);
  protected readonly supplier = signal<Supplier | null>(null);
  protected readonly deliveryAddresses = signal<DeliveryAddress[]>([]);

  protected readonly selectedAddress = computed(() => {
    const addressId = this.order()?.deliveryAddressId;
    if (!addressId) return null;
    return this.deliveryAddresses().find(a => a.id === addressId) || null;
  });

  private updateDebounce: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    const idParam = this.routeParams()?.get('id');
    if (!idParam) {
      this.isLoading.set(false);
      return;
    }

    const orderId = Number(idParam);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    try {
      const [order, addresses] = await Promise.all([
        this.supabase.getSupplierOrder(orderId),
        this.supabase.getDeliveryAddresses()
      ]);

      if (!order) {
        this.isLoading.set(false);
        return;
      }

      this.order.set(order);
      this.deliveryAddresses.set(addresses);

      // Load items and supplier
      const [items, supplier] = await Promise.all([
        this.supabase.getSupplierOrderItems(orderId),
        this.supabase.getSupplier(order.supplierId)
      ]);

      this.items.set(items);
      this.supplier.set(supplier);

      // Check if we should auto-open send dialog
      const action = this.queryParams()?.get('action');
      if (action === 'send' && order.status === 'draft') {
        // Small delay to ensure UI is ready
        setTimeout(() => this.sendOrder(), 100);
      }
    } catch (error) {
      console.error('Error loading supplier order:', error);
      this.notification.showError('Error al cargar el pedido');
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusIcon(status: SupplierOrderStatus): string {
    switch (status) {
      case 'draft': return 'edit_note';
      case 'sent': return 'send';
      case 'delivered': return 'check_circle';
      default: return 'help';
    }
  }

  getStatusLabel(status: SupplierOrderStatus): string {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregado';
      default: return status;
    }
  }

  async onDeliveryAddressChange(addressId: number | null): Promise<void> {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.order.set({ ...currentOrder, deliveryAddressId: addressId });
    this.debouncedUpdate({ deliveryAddressId: addressId });
  }

  async onNotesChange(notes: string): Promise<void> {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.order.set({ ...currentOrder, notes });
    this.debouncedUpdate({ notes });
  }

  async onCustomerReferenceChange(customerReference: string): Promise<void> {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.order.set({ ...currentOrder, customerReference });
    this.debouncedUpdate({ customerReference });
  }

  private debouncedUpdate(updates: Partial<SupplierOrder>): void {
    if (this.updateDebounce) {
      clearTimeout(this.updateDebounce);
    }

    this.updateDebounce = setTimeout(async () => {
      const currentOrder = this.order();
      if (!currentOrder) return;

      try {
        await this.supabase.updateSupplierOrder(currentOrder.id, updates);
      } catch (error) {
        console.error('Error updating order:', error);
        this.notification.showError('Error al guardar cambios');
      }
    }, 500);
  }

  async sendOrder(): Promise<void> {
    const currentOrder = this.order();
    const currentSupplier = this.supplier();

    if (!currentOrder || !currentSupplier) {
      this.notification.showError('No se puede enviar el pedido');
      return;
    }

    if (!currentSupplier.email) {
      this.notification.showError('El proveedor no tiene email configurado');
      return;
    }

    this.isSending.set(true);
    try {
      // For now, just mark as sent manually
      // TODO: Integrate with email service
      await this.supabase.updateSupplierOrder(currentOrder.id, {
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      this.order.set({
        ...currentOrder,
        status: 'sent',
        sentAt: new Date().toISOString()
      });

      this.notification.showSuccess('Pedido marcado como enviado');
    } catch (error) {
      console.error('Error sending order:', error);
      this.notification.showError('Error al enviar el pedido');
    } finally {
      this.isSending.set(false);
    }
  }

  async markAsDelivered(): Promise<void> {
    const currentOrder = this.order();
    if (!currentOrder) return;

    this.isUpdating.set(true);
    try {
      await this.supabase.updateSupplierOrder(currentOrder.id, {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });

      this.order.set({
        ...currentOrder,
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });

      this.notification.showSuccess('Pedido marcado como entregado');
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      this.notification.showError('Error al actualizar el estado');
    } finally {
      this.isUpdating.set(false);
    }
  }

  async downloadPdf(): Promise<void> {
    const currentOrder = this.order();
    if (!currentOrder) {
      this.notification.showError('No se puede generar el PDF sin pedido');
      return;
    }

    this.isGeneratingPdf.set(true);
    try {
      await this.pdfService.downloadOrderPdf({
        order: currentOrder,
        items: this.items(),
        supplier: this.supplier(),
        deliveryAddress: this.selectedAddress()
      });
      this.notification.showSuccess('PDF descargado correctamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.notification.showError('Error al generar el PDF');
    } finally {
      this.isGeneratingPdf.set(false);
    }
  }
}
