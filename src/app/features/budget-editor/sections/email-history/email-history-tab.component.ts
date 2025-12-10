import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { EmailLog, EmailLogFilters, EmailStatus } from '../../../../models/email-log.model';
import { EmailService } from '../../../../services/email.service';

@Component({
  selector: 'app-email-history-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="email-history-container">
      <div class="history-header">
        <h2>Historial de Emails</h2>
        <p class="history-subtitle">
          {{ total() }} email{{ total() !== 1 ? 's' : '' }} enviado{{ total() !== 1 ? 's' : '' }}
        </p>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label for="statusFilter">Estado</label>
          <select id="statusFilter" [formControl]="filtersForm.controls.status">
            <option value="">Todos</option>
            <option value="sent">Enviado</option>
            <option value="failed">Fallido</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>

        <div class="filter-group search-group">
          <label for="emailFilter">Buscar por email</label>
          <div class="search-input-wrapper">
            <span class="material-symbols-rounded">search</span>
            <input
              id="emailFilter"
              type="text"
              [formControl]="filtersForm.controls.searchEmail"
              placeholder="Buscar destinatario..."
            />
            @if (filtersForm.controls.searchEmail.value) {
              <button
                type="button"
                class="clear-search"
                (click)="filtersForm.controls.searchEmail.setValue('')"
              >
                <span class="material-symbols-rounded">close</span>
              </button>
            }
          </div>
        </div>

        <button
          type="button"
          class="btn-reset-filters"
          (click)="resetFilters()"
          [disabled]="!hasActiveFilters()"
        >
          <span class="material-symbols-rounded">filter_alt_off</span>
          Limpiar filtros
        </button>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Cargando historial...</span>
        </div>
      } @else if (emailLogs().length === 0) {
        <div class="empty-state">
          <span class="material-symbols-rounded">mail</span>
          @if (hasActiveFilters()) {
            <p>No se encontraron emails con los filtros seleccionados</p>
            <button class="btn-clear" (click)="resetFilters()">Limpiar filtros</button>
          } @else {
            <p>No se han enviado emails para este presupuesto</p>
          }
        </div>
      } @else {
        <div class="emails-table-wrapper">
          <table class="emails-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Destinatario</th>
                <th>Asunto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (log of emailLogs(); track log.id) {
                <tr>
                  <td class="cell-date">
                    {{ log.createdAt | date:'dd/MM/yyyy HH:mm' }}
                  </td>
                  <td class="cell-email">
                    <span class="email-address">{{ log.recipientEmail }}</span>
                    @if (log.recipientName) {
                      <span class="recipient-name">{{ log.recipientName }}</span>
                    }
                  </td>
                  <td class="cell-subject">{{ log.subject }}</td>
                  <td class="cell-status">
                    <span class="status-badge" [class]="'status-' + log.status">
                      @switch (log.status) {
                        @case ('sent') {
                          <span class="material-symbols-rounded">check_circle</span>
                          Enviado
                        }
                        @case ('failed') {
                          <span class="material-symbols-rounded">error</span>
                          Fallido
                        }
                        @case ('pending') {
                          <span class="material-symbols-rounded">schedule</span>
                          Pendiente
                        }
                      }
                    </span>
                    @if (log.status === 'failed' && log.errorMessage) {
                      <span class="error-tooltip" [title]="log.errorMessage">
                        <span class="material-symbols-rounded">info</span>
                      </span>
                    }
                  </td>
                  <td class="cell-actions">
                    <button
                      type="button"
                      class="btn-retry"
                      (click)="onRetry(log)"
                      [title]="log.status === 'failed' ? 'Reintentar envío' : 'Reenviar email'"
                    >
                      <span class="material-symbols-rounded">
                        {{ log.status === 'failed' ? 'refresh' : 'forward_to_inbox' }}
                      </span>
                      {{ log.status === 'failed' ? 'Reintentar' : 'Reenviar' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (hasMoreLogs()) {
          <div class="load-more">
            <button
              type="button"
              class="btn-load-more"
              (click)="loadMore()"
              [disabled]="isLoadingMore()"
            >
              @if (isLoadingMore()) {
                <div class="spinner-small"></div>
                Cargando...
              } @else {
                <span class="material-symbols-rounded">expand_more</span>
                Cargar más ({{ remainingCount() }} restantes)
              }
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .email-history-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .history-header {
      margin-bottom: 1.5rem;
    }

    .history-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 0.25rem;
    }

    .history-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    /* Filters */
    .filters-section {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .filter-group label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
    }

    .filter-group select {
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      background: white;
      font-size: 0.875rem;
      color: #111827;
      min-width: 140px;
      cursor: pointer;
    }

    .filter-group select:focus {
      outline: none;
      border-color: #6b7280;
    }

    .search-group {
      flex: 1;
      min-width: 200px;
      max-width: 320px;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input-wrapper > .material-symbols-rounded {
      position: absolute;
      left: 0.75rem;
      color: #9ca3af;
      font-size: 1.125rem;
      pointer-events: none;
    }

    .search-input-wrapper input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 2.25rem;
      border: 1px solid #d1d5db;
      font-size: 0.875rem;
      color: #111827;
    }

    .search-input-wrapper input:focus {
      outline: none;
      border-color: #6b7280;
    }

    .clear-search {
      position: absolute;
      right: 0.5rem;
      padding: 0.25rem;
      background: none;
      border: none;
      cursor: pointer;
      color: #9ca3af;
      display: flex;
    }

    .clear-search:hover {
      color: #6b7280;
    }

    .clear-search .material-symbols-rounded {
      font-size: 1rem;
    }

    .btn-reset-filters {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      background: white;
      border: 1px solid #d1d5db;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-reset-filters:hover:not(:disabled) {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-reset-filters:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-reset-filters .material-symbols-rounded {
      font-size: 1rem;
    }

    /* Table */
    .emails-table-wrapper {
      overflow-x: auto;
      border: 1px solid #e5e7eb;
    }

    .emails-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .emails-table thead {
      background: #f9fafb;
    }

    .emails-table th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
    }

    .emails-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }

    .emails-table tbody tr:hover {
      background: #f9fafb;
    }

    .cell-date {
      white-space: nowrap;
      color: #6b7280;
    }

    .cell-email {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .email-address {
      font-weight: 500;
      color: #111827;
    }

    .recipient-name {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .cell-subject {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #374151;
    }

    .cell-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 2px;
    }

    .status-badge .material-symbols-rounded {
      font-size: 0.875rem;
    }

    .status-sent {
      background: #d1fae5;
      color: #065f46;
    }

    .status-failed {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .error-tooltip {
      color: #9ca3af;
      cursor: help;
    }

    .error-tooltip .material-symbols-rounded {
      font-size: 1rem;
    }

    .cell-actions {
      white-space: nowrap;
    }

    .btn-retry {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: #374151;
      background: white;
      border: 1px solid #d1d5db;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-retry:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-retry .material-symbols-rounded {
      font-size: 1rem;
    }

    /* Empty & Loading states */
    .empty-state,
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }

    .empty-state .material-symbols-rounded {
      font-size: 3rem;
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state p {
      margin: 0 0 1rem;
      color: #6b7280;
    }

    .btn-clear {
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      background: white;
      border: 1px solid #d1d5db;
      cursor: pointer;
    }

    .btn-clear:hover {
      background: #f3f4f6;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top-color: #6b7280;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    .loading-state span {
      color: #6b7280;
    }

    /* Load more */
    .load-more {
      display: flex;
      justify-content: center;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-top: none;
      background: #f9fafb;
    }

    .btn-load-more {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      background: white;
      border: 1px solid #d1d5db;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-load-more:hover:not(:disabled) {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-load-more:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-load-more .material-symbols-rounded {
      font-size: 1.25rem;
    }

    .spinner-small {
      width: 1rem;
      height: 1rem;
      border: 2px solid #e5e7eb;
      border-top-color: #6b7280;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class EmailHistoryTabComponent implements OnInit {
  readonly budgetId = input.required<number>();
  readonly retryEmail = output<EmailLog>();

  private readonly emailService = inject(EmailService);

  protected readonly emailLogs = signal<EmailLog[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingMore = signal(false);

  private readonly pageSize = 50;
  private currentOffset = 0;

  protected readonly filtersForm = new FormGroup({
    status: new FormControl<EmailStatus | ''>(''),
    searchEmail: new FormControl('')
  });

  protected readonly hasActiveFilters = computed(() => {
    const status = this.filtersForm.controls.status.value;
    const search = this.filtersForm.controls.searchEmail.value;
    return !!status || !!search;
  });

  protected readonly hasMoreLogs = computed(() => {
    return this.emailLogs().length < this.total();
  });

  protected readonly remainingCount = computed(() => {
    return this.total() - this.emailLogs().length;
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadHistory();

    // Subscribe to filter changes with debounce for search
    this.filtersForm.controls.status.valueChanges.subscribe(() => {
      this.resetAndLoad();
    });

    this.filtersForm.controls.searchEmail.valueChanges.subscribe(() => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.resetAndLoad();
      }, 300);
    });
  }

  /**
   * Public method to refresh the history from parent component
   */
  refreshHistory(): void {
    this.resetAndLoad();
  }

  async loadHistory(): Promise<void> {
    this.isLoading.set(true);

    try {
      const filters = this.buildFilters();
      const response = await this.emailService.getEmailLogsByBudgetId(
        this.budgetId(),
        this.pageSize,
        0,
        filters
      );

      this.emailLogs.set(response.logs);
      this.total.set(response.total);
      this.currentOffset = response.logs.length;
    } catch (error) {
      console.error('Error loading email history:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMoreLogs()) {
      return;
    }

    this.isLoadingMore.set(true);

    try {
      const filters = this.buildFilters();
      const response = await this.emailService.getEmailLogsByBudgetId(
        this.budgetId(),
        this.pageSize,
        this.currentOffset,
        filters
      );

      this.emailLogs.update(current => [...current, ...response.logs]);
      this.currentOffset += response.logs.length;
    } catch (error) {
      console.error('Error loading more emails:', error);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  resetFilters(): void {
    this.filtersForm.reset({ status: '', searchEmail: '' });
  }

  onRetry(log: EmailLog): void {
    this.retryEmail.emit(log);
  }

  private resetAndLoad(): void {
    this.currentOffset = 0;
    this.loadHistory();
  }

  private buildFilters(): EmailLogFilters | undefined {
    const status = this.filtersForm.controls.status.value;
    const searchEmail = this.filtersForm.controls.searchEmail.value;

    if (!status && !searchEmail) {
      return undefined;
    }

    return {
      status: status ? (status as EmailStatus) : undefined,
      searchEmail: searchEmail || undefined
    };
  }
}
