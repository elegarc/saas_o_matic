import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { PlanInfo } from '../../../core/models/catalog.model';
import { Customer } from '../../../core/models/customer.model';
import { Simulation } from '../../../core/models/simulation.model';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CurrencyExchangeService } from '../../../core/services/currency-exchange.service';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { SimulationApiService } from '../../../core/services/simulation-api.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBannerComponent } from '../../../shared/components/status-banner/status-banner.component';
import { CurrencyConvertPipe } from '../../../shared/pipes/currency-convert.pipe';
import { TaxIdFormatPipe } from '../../../shared/pipes/tax-id-format.pipe';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    LoadingStateComponent,
    EmptyStateComponent,
    StatusBannerComponent,
    CurrencyConvertPipe,
    TaxIdFormatPipe,
  ],
  template: `
    <div class="detail-container">
      <!-- Breadcrumb & Primary Action Bar -->
      <div class="top-nav-bar">
        <button mat-button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          <span>Volver al Dashboard</span>
        </button>

        @if (customer()) {
          <button
            mat-flat-button
            color="primary"
            class="new-sim-btn"
            (click)="openSimulation()"
          >
            <mat-icon>add_chart</mat-icon>
            <span>Nueva Simulación</span>
          </button>
        }
      </div>

      @if (errorMessage()) {
        <app-status-banner
          type="error"
          [message]="errorMessage()!"
          actionLabel="Reintentar"
          (actionClick)="loadCustomerData()"
        ></app-status-banner>
      }

      @if (isLoadingCustomer()) {
        <app-loading-state message="Cargando ficha del cliente corporativo..."></app-loading-state>
      } @else if (customer()) {
        <!-- Customer Profile Card -->
        <mat-card class="customer-profile-card" appearance="outlined">
          <mat-card-header class="profile-header">
            <div class="profile-title-block">
              <div class="title-with-country">
                <h1 class="customer-name">{{ customer()!.company_name }}</h1>
                <span class="country-badge">{{ customer()!.country_code }} - {{ customer()!.country_name }}</span>
              </div>
              <div class="profile-meta-tags">
                <span class="meta-tag">
                  <mat-icon class="meta-icon">badge</mat-icon>
                  {{ customer()!.tax_id | taxIdFormat }}
                </span>
                <span class="meta-tag">
                  <mat-icon class="meta-icon">percent</mat-icon>
                  IVA / Tax: {{ customer()!.tax_rate_percent }}%
                </span>
                <span class="meta-tag">
                  <mat-icon class="meta-icon">email</mat-icon>
                  {{ customer()!.contact_email }}
                </span>
              </div>
            </div>

            <div class="plan-summary-badge">
              <span class="plan-name-label">Plan Base</span>
              <span class="plan-code-badge">{{ customer()!.plan }}</span>
              @if (activePlan) {
                <span class="plan-quotas-sub">
                  {{ activePlan.included_storage_gb }} GB · {{ activePlan.included_api_calls | number: '1.0-0' }} API
                </span>
              }
              <span class="overage-label">
                Excedentes: {{ customer()!.overage_policy === 'HARD_CAP' ? 'Bloqueo (CAP)' : 'Progresivo' }}
              </span>
            </div>
          </mat-card-header>
        </mat-card>

        <!-- Simulations History Section -->
        <section class="history-section">
          <mat-card class="history-card" appearance="outlined">
            <mat-card-header class="history-header">
              <mat-card-title class="history-title">
                <mat-icon class="history-icon">history</mat-icon>
                <span>Historial de Simulaciones</span>
              </mat-card-title>
              <span class="history-count">{{ simulations().length }} simulaciones registradas</span>
            </mat-card-header>

            <mat-card-content class="history-content">
              @if (isLoadingHistory()) {
                <app-loading-state message="Cargando historial de simulaciones..."></app-loading-state>
              } @else if (simulations().length === 0) {
                <app-empty-state
                  icon="receipt"
                  title="Aún no hay simulaciones registradas"
                  subtitle="Pulse 'Nueva Simulación' para configurar un escenario de consumo y calcular su presupuesto."
                  actionLabel="Nueva Simulación"
                  (actionClick)="openSimulation()"
                ></app-empty-state>
              } @else {
                <div class="table-responsive">
                  <table mat-table [dataSource]="simulations()" class="simulations-table">
                    <!-- Date Column -->
                    <ng-container matColumnDef="created_at">
                      <th mat-header-cell *matHeaderCellDef>Fecha / Hora</th>
                      <td mat-cell *matCellDef="let sim">
                        {{ sim.created_at | date: 'dd/MM/yyyy HH:mm' }}
                      </td>
                    </ng-container>

                    <!-- Plan Applied Column -->
                    <ng-container matColumnDef="plan">
                      <th mat-header-cell *matHeaderCellDef>Plan</th>
                      <td mat-cell *matCellDef="let sim">
                        <span class="plan-tag">{{ sim.plan_applied }}</span>
                      </td>
                    </ng-container>

                    <!-- Active Users Column -->
                    <ng-container matColumnDef="users">
                      <th mat-header-cell *matHeaderCellDef>Usuarios</th>
                      <td mat-cell *matCellDef="let sim">
                        <strong>{{ sim.active_users }}</strong>
                      </td>
                    </ng-container>

                    <!-- Storage Column -->
                    <ng-container matColumnDef="storage">
                      <th mat-header-cell *matHeaderCellDef>Almacenamiento</th>
                      <td mat-cell *matCellDef="let sim">
                        {{ sim.storage_gb }} GB
                        @if (sim.breakdown.extra_storage_gb > 0) {
                          <span class="extra-hint">(+{{ sim.breakdown.extra_storage_gb }} GB)</span>
                        }
                      </td>
                    </ng-container>

                    <!-- API Calls Column -->
                    <ng-container matColumnDef="api">
                      <th mat-header-cell *matHeaderCellDef>Llamadas API</th>
                      <td mat-cell *matCellDef="let sim">
                        {{ sim.estimated_api_calls | number: '1.0-0' }}
                        @if (sim.breakdown.extra_api_calls > 0) {
                          <span class="extra-hint">(+{{ sim.breakdown.extra_api_calls | number: '1.0-0' }})</span>
                        }
                      </td>
                    </ng-container>

                    <!-- Subtotal Column -->
                    <ng-container matColumnDef="subtotal">
                      <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                      <td mat-cell *matCellDef="let sim">
                        {{ sim.breakdown.subtotal_eur | currencyConvert: 'EUR' }}
                      </td>
                    </ng-container>

                    <!-- Tax Column -->
                    <ng-container matColumnDef="tax">
                      <th mat-header-cell *matHeaderCellDef>Impuesto / IVA</th>
                      <td mat-cell *matCellDef="let sim">
                        {{ sim.breakdown.tax_amount_eur | currencyConvert: 'EUR' }}
                        <span class="extra-hint">({{ sim.breakdown.tax_rate_percent }}%)</span>
                      </td>
                    </ng-container>

                    <!-- Total EUR Column -->
                    <ng-container matColumnDef="total_eur">
                      <th mat-header-cell *matHeaderCellDef>Total EUR</th>
                      <td mat-cell *matCellDef="let sim" class="total-eur-cell">
                        {{ sim.breakdown.total_eur | currencyConvert: 'EUR' }}
                      </td>
                    </ng-container>

                    <!-- Total Converted Column -->
                    <ng-container matColumnDef="total_converted">
                      <th mat-header-cell *matHeaderCellDef>En {{ activeCurrency() }}</th>
                      <td mat-cell *matCellDef="let sim" class="total-converted-cell">
                        {{ sim.breakdown.total_eur | currencyConvert: activeCurrency() : activeRate() }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                  </table>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .detail-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px 16px 48px 16px;
      }
      .top-nav-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 20px;
      }
      .back-btn {
        font-weight: 500;
        color: #475569;
      }
      .new-sim-btn {
        height: 40px;
        font-weight: 600;
      }
      .customer-profile-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 24px;
      }
      .profile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        padding: 20px !important;
      }
      .profile-title-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .title-with-country {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .customer-name {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #0f172a;
      }
      .country-badge {
        font-size: 12px;
        font-weight: 600;
        background-color: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .profile-meta-tags {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .meta-tag {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: #475569;
      }
      .meta-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #64748b;
      }
      .plan-summary-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 10px 16px;
        border-radius: 8px;
      }
      .plan-name-label {
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .plan-code-badge {
        font-size: 18px;
        font-weight: 700;
        color: #2563eb;
      }
      .plan-quotas-sub {
        font-size: 12px;
        color: #334155;
        font-weight: 500;
      }
      .overage-label {
        font-size: 11px;
        color: #475569;
        font-weight: 500;
      }
      .history-section {
        margin-top: 8px;
      }
      .history-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px !important;
        border-bottom: 1px solid #f1f5f9;
      }
      .history-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
      }
      .history-icon {
        color: #2563eb;
      }
      .history-count {
        font-size: 12px;
        color: #64748b;
      }
      .history-content {
        padding: 0 !important;
      }
      .table-responsive {
        overflow-x: auto;
      }
      .simulations-table {
        width: 100%;
        background-color: transparent;
      }
      .simulations-table th {
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background-color: #f8fafc;
        padding: 12px 16px;
      }
      .simulations-table td {
        font-size: 13px;
        color: #334155;
        padding: 12px 16px;
        border-bottom: 1px solid #f1f5f9;
      }
      .plan-tag {
        font-weight: 600;
        color: #2563eb;
        background-color: #eff6ff;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      .extra-hint {
        font-size: 11px;
        color: #ea580c;
        margin-left: 4px;
      }
      .total-eur-cell {
        font-weight: 700;
        color: #0f172a;
      }
      .total-converted-cell {
        font-weight: 700;
        color: #1d4ed8;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailComponent implements OnInit {
  // Input bound from route parameter :customerId via withComponentInputBinding()
  readonly customerId = input<string>();

  private readonly customerService = inject(CustomerApiService);
  private readonly simulationService = inject(SimulationApiService);
  private readonly catalogService = inject(CatalogApiService);
  private readonly currencyService = inject(CurrencyExchangeService);
  private readonly router = inject(Router);

  readonly customer = signal<Customer | null>(null);
  readonly simulations = signal<Simulation[]>([]);
  readonly plans = signal<PlanInfo[]>([]);

  readonly isLoadingCustomer = signal<boolean>(true);
  readonly isLoadingHistory = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly activeCurrency = this.currencyService.activeCurrency;
  readonly activeRate = this.currencyService.activeRate;

  readonly displayedColumns = [
    'created_at',
    'plan',
    'users',
    'storage',
    'api',
    'subtotal',
    'tax',
    'total_eur',
    'total_converted',
  ];

  get activePlan(): PlanInfo | null {
    const cust = this.customer();
    if (!cust) {
      return null;
    }
    return this.plans().find((p) => p.code === cust.plan) || null;
  }

  ngOnInit(): void {
    this.loadPlans();
    this.loadCustomerData();
  }

  loadPlans(): void {
    this.catalogService.getPlans().subscribe({
      next: (data) => this.plans.set(data),
      error: () => {},
    });
  }

  loadCustomerData(): void {
    const id = parseInt(this.customerId() || '0', 10);
    if (!id) {
      this.errorMessage.set('Identificador de cliente no válido.');
      this.isLoadingCustomer.set(false);
      return;
    }

    this.isLoadingCustomer.set(true);
    this.isLoadingHistory.set(true);
    this.errorMessage.set(null);

    this.customerService.getCustomerById(id).subscribe({
      next: (cust) => {
        this.customer.set(cust);
        this.isLoadingCustomer.set(false);
        this.loadHistory(cust.id);
      },
      error: (err: Error) => {
        this.isLoadingCustomer.set(false);
        this.isLoadingHistory.set(false);
        this.errorMessage.set(err.message || 'Error al cargar la información del cliente.');
      },
    });
  }

  loadHistory(customerId: number): void {
    this.simulationService.getCustomerSimulations(customerId).subscribe({
      next: (sims) => {
        this.simulations.set(sims);
        this.isLoadingHistory.set(false);
      },
      error: (err: Error) => {
        this.isLoadingHistory.set(false);
        this.errorMessage.set(err.message || 'Error al cargar el historial de simulaciones.');
      },
    });
  }

  openSimulation(): void {
    const id = this.customer()?.id ?? this.customerId();
    if (id) {
      this.router.navigate(['/customers', id, 'simulate']);
    }
  }

  goBack(): void {
    this.router.navigate(['/customers']);
  }
}

