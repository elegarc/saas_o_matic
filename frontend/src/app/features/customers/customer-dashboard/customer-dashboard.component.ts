import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Customer } from '../../../core/models/customer.model';
import { CurrencyExchangeService } from '../../../core/services/currency-exchange.service';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBannerComponent } from '../../../shared/components/status-banner/status-banner.component';
import { TaxIdFormatPipe } from '../../../shared/pipes/tax-id-format.pipe';
import { CustomerCreateDialogComponent } from '../customer-create-dialog/customer-create-dialog.component';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    LoadingStateComponent,
    EmptyStateComponent,
    StatusBannerComponent,
    TaxIdFormatPipe,
  ],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div class="header-titles">
          <h1 class="page-title">Cartera de Clientes Corporativos</h1>
          <p class="page-subtitle">
            Búsqueda de cuentas comerciales, consulta de identificadores fiscales y simulación de suscripciones SaaS.
          </p>
        </div>
        <button mat-flat-button color="primary" class="create-btn" (click)="openCreateDialog()">
          <mat-icon>add_business</mat-icon>
          <span>Registrar Nuevo Cliente</span>
        </button>
      </div>

      <div class="search-bar-row">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Buscar por empresa o identificador fiscal (CIF, NIF, DNI...)</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            placeholder="Ej: Acme Iberia o B58818501"
          />
          <mat-icon matPrefix class="search-icon">search</mat-icon>
          @if (searchControl.value) {
            <button
              mat-icon-button
              matSuffix
              (click)="clearSearch()"
              aria-label="Limpiar búsqueda"
            >
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
      </div>

      @if (errorMessage()) {
        <app-status-banner
          type="error"
          [message]="errorMessage()!"
          actionLabel="Reintentar"
          (actionClick)="loadCustomers()"
        ></app-status-banner>
      }

      @if (isLoading()) {
        <app-loading-state message="Cargando clientes corporativos..."></app-loading-state>
      } @else if (customers().length === 0) {
        <app-empty-state
          icon="search_off"
          title="No se encontraron clientes"
          [subtitle]="
            searchControl.value
              ? 'No hay resultados que coincidan con el término de búsqueda.'
              : 'Aún no se ha registrado ningún cliente corporativo en el sistema.'
          "
          [actionLabel]="searchControl.value ? 'Limpiar búsqueda' : 'Registrar primer cliente'"
          (actionClick)="searchControl.value ? clearSearch() : openCreateDialog()"
        ></app-empty-state>
      } @else {
        <div class="cards-grid">
          @for (customer of customers(); track customer.id) {
            <mat-card
              class="customer-card"
              appearance="outlined"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Ver detalle e historial de ' + customer.company_name"
              (click)="viewCustomer(customer.id)"
              (keydown.enter)="viewCustomer(customer.id)"
            >
              <mat-card-header class="card-header">
                <div class="header-title-row">
                  <h3 class="company-name" [title]="customer.company_name">
                    {{ customer.company_name }}
                  </h3>
                  <span class="country-tag" [title]="customer.country_name">
                    {{ customer.country_code }}
                  </span>
                </div>
                <div class="tax-badge-row">
                  <span class="tax-id-badge">
                    {{ customer.tax_id | taxIdFormat }}
                  </span>
                  <span class="tax-rate-sub">
                    IVA: {{ customer.tax_rate_percent }}%
                  </span>
                </div>
              </mat-card-header>

              <mat-card-content class="card-content">
                <div class="detail-row">
                  <span class="detail-label">Plan contratado:</span>
                  <span class="detail-value plan-badge">{{ customer.plan }}</span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">Política excedentes:</span>
                  <span
                    class="policy-chip"
                    [class.hard-cap]="customer.overage_policy === 'HARD_CAP'"
                  >
                    {{ customer.overage_policy === 'HARD_CAP' ? 'Bloqueo (CAP)' : 'Progresivo' }}
                  </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">Contacto:</span>
                  <span class="detail-value email-text" [title]="customer.contact_email">
                    {{ customer.contact_email }}
                  </span>
                </div>
              </mat-card-content>

              <mat-card-actions class="card-actions">
                <button
                  mat-stroked-button
                  color="primary"
                  class="action-btn"
                  (click)="$event.stopPropagation(); viewCustomer(customer.id)"
                >
                  <span>Ver Detalle e Historial</span>
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>

        <div class="pagination-footer">
          <span class="pagination-info">
            Mostrando {{ offset() + 1 }} - {{ getEndIndex() }} de {{ total() }} clientes
          </span>
          <div class="pagination-buttons">
            <button
              mat-button
              [disabled]="offset() === 0"
              (click)="prevPage()"
            >
              <mat-icon>chevron_left</mat-icon>
              <span>Anterior</span>
            </button>
            <button
              mat-button
              [disabled]="offset() + limit >= total()"
              (click)="nextPage()"
            >
              <span>Siguiente</span>
              <mat-icon iconPositionEnd>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 16px;
      }
      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 24px;
      }
      .page-title {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 6px 0;
      }
      .page-subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 0;
        max-width: 600px;
      }
      .create-btn {
        height: 42px;
        font-weight: 600;
      }
      .search-bar-row {
        margin-bottom: 20px;
      }
      .search-field {
        width: 100%;
      }
      .search-icon {
        color: #64748b;
        margin-right: 8px;
      }
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
        margin-bottom: 24px;
      }
      .customer-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .customer-card:hover,
      .customer-card:focus-visible {
        transform: translateY(-2px);
        border-color: #93c5fd;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        outline: none;
      }
      .card-header {
        padding: 16px 16px 8px 16px;
      }
      .header-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }
      .company-name {
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .country-tag {
        font-size: 11px;
        font-weight: 700;
        background-color: #eff6ff;
        color: #1d4ed8;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #bfdbfe;
      }
      .tax-badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }
      .tax-id-badge {
        font-size: 12px;
        font-weight: 600;
        color: #334155;
        background-color: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .tax-rate-sub {
        font-size: 11px;
        color: #64748b;
      }
      .card-content {
        padding: 8px 16px !important;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }
      .detail-label {
        color: #64748b;
      }
      .detail-value {
        font-weight: 500;
        color: #1e293b;
      }
      .email-text {
        max-width: 180px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .plan-badge {
        font-weight: 700;
        color: #2563eb;
      }
      .policy-chip {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        background-color: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .policy-chip.hard-cap {
        background-color: #fff7ed;
        color: #c2410c;
        border-color: #fed7aa;
      }
      .card-actions {
        padding: 12px 16px 16px 16px;
      }
      .action-btn {
        width: 100%;
        font-weight: 600;
      }
      .pagination-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;
        border-top: 1px solid #e2e8f0;
      }
      .pagination-info {
        font-size: 13px;
        color: #64748b;
      }
      .pagination-buttons {
        display: flex;
        gap: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboardComponent implements OnInit {
  private readonly customerService = inject(CustomerApiService);
  private readonly currencyService = inject(CurrencyExchangeService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  readonly customers = signal<Customer[]>([]);
  readonly total = signal<number>(0);
  readonly offset = signal<number>(0);
  readonly limit = 12;

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly activeCurrency = this.currencyService.activeCurrency;
  readonly activeRate = this.currencyService.activeRate;

  ngOnInit(): void {
    this.loadCustomers();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.offset.set(0);
        this.loadCustomers();
      });
  }

  loadCustomers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const query = this.searchControl.value;
    this.customerService.getCustomers(query, this.limit, this.offset()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.customers.set(res.items);
        this.total.set(res.total);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Error al cargar el listado de clientes.');
      },
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CustomerCreateDialogComponent, {
      width: '600px',
      autoFocus: 'first-tabbable',
    });

    dialogRef.afterClosed().subscribe((result: Customer | undefined) => {
      if (result) {
        this.offset.set(0);
        this.loadCustomers();
      }
    });
  }

  viewCustomer(customerId: number): void {
    this.router.navigate(['/customers', customerId]);
  }

  prevPage(): void {
    if (this.offset() >= this.limit) {
      this.offset.update((val) => val - this.limit);
      this.loadCustomers();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.total()) {
      this.offset.update((val) => val + this.limit);
      this.loadCustomers();
    }
  }

  getEndIndex(): number {
    return Math.min(this.offset() + this.limit, this.total());
  }
}

