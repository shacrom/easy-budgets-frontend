import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';
import { NotificationService } from '../../../services/notification.service';
import { SupplierOrder, SupplierOrderStatus } from '../../../models/supplier-order.model';
import { Supplier } from '../../../models/supplier.model';
import { DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-supplier-orders-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="container">
      <header class="page-header">
        <div class="header-left">
          <h1>
            <span class="material-icons header-icon">local_shipping</span>
            Pedidos a proveedores
          </h1>
        </div>
      </header>

      <!-- Filters -->
      <section class="filters-section">
        <div class="filter-group">
          <label for="statusFilter">Estado:</label>
          <select id="statusFilter" 
                  [value]="statusFilter()"
                  (change)="onStatusFilterChange($event)">
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="sent">Enviado</option>
            <option value="delivered">Entregado</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="supplierFilter">Proveedor:</label>
          <select id="supplierFilter"
                  [value]="supplierFilter()"
                  (change)="onSupplierFilterChange($event)">
            <option value="">Todos</option>
            @for (supplier of suppliers(); track supplier.id) {
              <option [value]="supplier.id">{{ supplier.name }}</option>
            }
          </select>
        </div>
        <div class="filter-group search-group">
          <span class="material-icons search-icon">search</span>
          <input type="text" 
                 placeholder="Buscar por número o referencia..."
                 [value]="searchTerm()"
                 (input)="onSearchInput($event)">
        </div>
      </section>

      <!-- Orders table -->
      @if (isLoading()) {
        <div class="loading-container">
          <span class="material-icons spinning">sync</span>
          <p>Cargando pedidos...</p>
        </div>
      } @else if (filteredOrders().length === 0) {
        <div class="empty-state">
          <span class="material-icons">inbox</span>
          <h3>No hay pedidos</h3>
          <p>
            @if (hasActiveFilters()) {
              No se encontraron pedidos con los filtros seleccionados.
            } @else {
              Aún no has creado ningún pedido a proveedor.
            }
          </p>
          @if (hasActiveFilters()) {
            <button class="btn btn-outline" (click)="clearFilters()">
              Limpiar filtros
            </button>
          }
        </div>
      } @else {
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Proveedor</th>
                <th>Presupuesto</th>
                <th>Productos</th>
                <th class="text-right">Total</th>
                <th>Estado</th>
                <th>Fecha creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (order of filteredOrders(); track order.id) {
                <tr [class.draft]="order.status === 'draft'"
                    [class.sent]="order.status === 'sent'"
                    [class.delivered]="order.status === 'delivered'">
                  <td class="order-number">
                    <a [routerLink]="['/supplier-orders', order.id]">
                      {{ order.orderNumber }}
                    </a>
                  </td>
                  <td>{{ getSupplierName(order.supplierId) }}</td>
                  <td>
                    @if (order.budgetId) {
                      <a [routerLink]="['/budgets', order.budgetId]" class="budget-link">
                        <span class="material-icons">description</span>
                        #{{ order.budgetId }}
                      </a>
                    } @else {
                      <span class="no-budget">-</span>
                    }
                  </td>
                  <td class="products-count">
                    {{ order.itemCount || 0 }} productos
                  </td>
                  <td class="text-right total-cell">
                    {{ order.totalAmount | number:'1.2-2' }} €
                  </td>
                  <td>
                    <span class="status-badge" [class]="'status-' + order.status">
                      <span class="material-icons">{{ getStatusIcon(order.status) }}</span>
                      {{ getStatusLabel(order.status) }}
                    </span>
                  </td>
                  <td class="date-cell">
                    {{ order.createdAt | date:'dd/MM/yyyy' }}
                  </td>
                  <td class="actions-cell">
                    <button class="btn-icon" title="Ver/Editar pedido"
                            (click)="openOrder(order.id)">
                      <span class="material-icons">edit</span>
                    </button>
                    @if (order.status === 'draft') {
                      <button class="btn-icon" title="Enviar pedido"
                              (click)="sendOrder(order)">
                        <span class="material-icons">send</span>
                      </button>
                    }
                    @if (order.status === 'sent') {
                      <button class="btn-icon" title="Marcar como entregado"
                              (click)="markAsDelivered(order)">
                        <span class="material-icons">check_circle</span>
                      </button>
                    }
                    <button class="btn-icon btn-icon-danger" title="Eliminar pedido"
                            (click)="deleteOrder(order)">
                      <span class="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Summary stats -->
      @if (!isLoading() && orders().length > 0) {
        <section class="stats-section">
          <div class="stat-card">
            <span class="material-icons">drafts</span>
            <div class="stat-content">
              <span class="stat-value">{{ draftCount() }}</span>
              <span class="stat-label">Borradores</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="material-icons">send</span>
            <div class="stat-content">
              <span class="stat-value">{{ sentCount() }}</span>
              <span class="stat-label">Enviados</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="material-icons">check_circle</span>
            <div class="stat-content">
              <span class="stat-value">{{ deliveredCount() }}</span>
              <span class="stat-label">Entregados</span>
            </div>
          </div>
          <div class="stat-card total">
            <span class="material-icons">euro</span>
            <div class="stat-content">
              <span class="stat-value">{{ totalPending() | number:'1.2-2' }} €</span>
              <span class="stat-label">Pendiente de entrega</span>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-left h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      font-size: 1.75rem;
      color: #1a1a2e;
    }

    .header-icon {
      font-size: 2rem;
      color: #3b82f6;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
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
      text-decoration: none;
      font-size: 0.875rem;
    }

    .btn-outline {
      background: white;
      border: 1px solid #e5e7eb;
      color: #374151;
    }

    .btn-outline:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .btn .material-icons {
      font-size: 1.125rem;
    }

    /* Filters */
    .filters-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      background: white;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-group label {
      font-size: 0.875rem;
      color: #6b7280;
      white-space: nowrap;
    }

    .filter-group select,
    .filter-group input {
      padding: 0.5rem 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.875rem;
      min-width: 150px;
    }

    .filter-group select:focus,
    .filter-group input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .search-group {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.125rem;
      color: #9ca3af;
    }

    .search-group input {
      width: 100%;
      padding-left: 2.5rem;
    }

    /* Loading and empty states */
    .loading-container,
    .empty-state {
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
    .empty-state .material-icons {
      font-size: 3rem;
      color: #9ca3af;
      margin-bottom: 1rem;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .empty-state h3 {
      margin: 0 0 0.5rem;
      color: #374151;
    }

    .empty-state p {
      color: #6b7280;
      margin: 0 0 1.5rem;
    }

    /* Table */
    .table-container {
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      overflow-x: auto;
    }

    .orders-table {
      width: 100%;
      border-collapse: collapse;
    }

    .orders-table th,
    .orders-table td {
      padding: 0.875rem 1rem;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .orders-table th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    .orders-table tbody tr:hover {
      background: #f9fafb;
    }

    .orders-table tbody tr:last-child td {
      border-bottom: none;
    }

    .text-right {
      text-align: right;
    }

    .order-number a {
      font-weight: 600;
      color: #3b82f6;
      text-decoration: none;
    }

    .order-number a:hover {
      text-decoration: underline;
    }

    .budget-link {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: #6b7280;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .budget-link:hover {
      color: #3b82f6;
    }

    .budget-link .material-icons {
      font-size: 1rem;
    }

    .no-budget {
      color: #9ca3af;
    }

    .products-count {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .total-cell {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .date-cell {
      color: #6b7280;
      font-size: 0.875rem;
      white-space: nowrap;
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

    /* Actions */
    .actions-cell {
      white-space: nowrap;
    }

    .btn-icon {
      background: transparent;
      border: none;
      padding: 0.375rem;
      border-radius: 6px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-icon .material-icons {
      font-size: 1.125rem;
    }

    .btn-icon-danger:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    /* Stats section */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: white;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .stat-card .material-icons {
      font-size: 2rem;
      color: #9ca3af;
    }

    .stat-card.total .material-icons {
      color: #3b82f6;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a2e;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
      }

      .filters-section {
        flex-direction: column;
      }

      .filter-group {
        width: 100%;
      }

      .filter-group select,
      .filter-group input {
        flex: 1;
      }
    }
  `]
})
export class SupplierOrdersListComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly orders = signal<SupplierOrder[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly statusFilter = signal<SupplierOrderStatus | ''>('');
  protected readonly supplierFilter = signal<number | ''>('');
  protected readonly searchTerm = signal<string>('');

  protected readonly filteredOrders = computed(() => {
    let result = this.orders();
    
    const status = this.statusFilter();
    if (status) {
      result = result.filter(o => o.status === status);
    }

    const supplierId = this.supplierFilter();
    if (supplierId) {
      result = result.filter(o => o.supplierId === supplierId);
    }

    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(o => 
        o.orderNumber.toLowerCase().includes(term) ||
        (o.customerReference?.toLowerCase().includes(term))
      );
    }

    return result;
  });

  protected readonly hasActiveFilters = computed(() => 
    this.statusFilter() !== '' || 
    this.supplierFilter() !== '' || 
    this.searchTerm().trim() !== ''
  );

  protected readonly draftCount = computed(() => 
    this.orders().filter(o => o.status === 'draft').length
  );

  protected readonly sentCount = computed(() => 
    this.orders().filter(o => o.status === 'sent').length
  );

  protected readonly deliveredCount = computed(() => 
    this.orders().filter(o => o.status === 'delivered').length
  );

  protected readonly totalPending = computed(() => 
    this.orders()
      .filter(o => o.status !== 'delivered')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  );

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [orders, suppliers] = await Promise.all([
        this.supabase.getSupplierOrders(),
        this.supabase.getSuppliers()
      ]);
      this.orders.set(orders);
      this.suppliers.set(suppliers);
    } catch (error) {
      console.error('Error loading supplier orders:', error);
      this.notification.showError('Error al cargar los pedidos');
    } finally {
      this.isLoading.set(false);
    }
  }

  getSupplierName(supplierId: number | null | undefined): string {
    if (!supplierId) return 'Sin proveedor';
    const supplier = this.suppliers().find(s => s.id === supplierId);
    return supplier?.name || 'Proveedor desconocido';
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

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusFilter.set(value as SupplierOrderStatus | '');
  }

  onSupplierFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.supplierFilter.set(value ? Number(value) : '');
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.supplierFilter.set('');
    this.searchTerm.set('');
  }

  openOrder(orderId: number): void {
    this.router.navigate(['/supplier-orders', orderId]);
  }

  async sendOrder(order: SupplierOrder): Promise<void> {
    // For now, just navigate to the order editor
    // The actual send functionality will be in the editor
    this.router.navigate(['/supplier-orders', order.id], { 
      queryParams: { action: 'send' } 
    });
  }

  async markAsDelivered(order: SupplierOrder): Promise<void> {
    try {
      await this.supabase.updateSupplierOrder(order.id, { 
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
      this.notification.showSuccess('Pedido marcado como entregado');
      await this.loadData();
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      this.notification.showError('Error al actualizar el estado del pedido');
    }
  }

  async deleteOrder(order: SupplierOrder): Promise<void> {
    if (!confirm(`¿Estás seguro de eliminar el pedido ${order.orderNumber}?`)) {
      return;
    }

    try {
      await this.supabase.deleteSupplierOrder(order.id);
      this.notification.showSuccess('Pedido eliminado correctamente');
      await this.loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      this.notification.showError('Error al eliminar el pedido');
    }
  }
}
