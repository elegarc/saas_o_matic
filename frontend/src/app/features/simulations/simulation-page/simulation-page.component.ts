import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PlanInfo } from '../../../core/models/catalog.model';
import { Customer } from '../../../core/models/customer.model';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBannerComponent } from '../../../shared/components/status-banner/status-banner.component';
import { TaxIdFormatPipe } from '../../../shared/pipes/tax-id-format.pipe';
import { SimulationStudioComponent } from '../simulation-studio/simulation-studio.component';

@Component({
  selector: 'app-simulation-page',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    LoadingStateComponent,
    StatusBannerComponent,
    TaxIdFormatPipe,
    SimulationStudioComponent,
  ],
  template: `
    <div class="simulation-page-container">
      <div class="top-nav-bar">
        <button mat-button class="back-btn" (click)="goBackToCustomer()">
          <mat-icon>arrow_back</mat-icon>
          <span>Volver a la Ficha del Cliente</span>
        </button>
      </div>

      @if (errorMessage()) {
        <app-status-banner
          type="error"
          [message]="errorMessage()!"
          actionLabel="Reintentar"
          (actionClick)="loadData()"
        ></app-status-banner>
      }

      @if (isLoading()) {
        <app-loading-state message="Preparando simulador para el cliente..."></app-loading-state>
      } @else if (customer() && activePlan()) {
        <mat-card class="context-card" appearance="outlined">
          <div class="context-row">
            <div class="context-info">
              <div class="context-heading">
                <h1 class="page-title">Nueva Simulación de Consumo</h1>
                <span class="company-pill">{{ customer()!.company_name }}</span>
              </div>
              <div class="context-meta">
                <span>{{ customer()!.tax_id | taxIdFormat }}</span>
                <span>•</span>
                <span>{{ customer()!.country_name }} (IVA {{ customer()!.tax_rate_percent }}%)</span>
                <span>•</span>
                <span>
                  Cuotas base: {{ activePlan()!.included_storage_gb }} GB /
                  {{ activePlan()!.included_api_calls | number: '1.0-0' }} llamadas
                </span>
              </div>
            </div>

            <div class="plan-chip">
              <span class="plan-label">Plan Base</span>
              <span class="plan-value">{{ activePlan()!.name }} ({{ activePlan()!.code }})</span>
            </div>
          </div>
        </mat-card>

        <app-simulation-studio
          [customer]="customer()!"
          [plan]="activePlan()!"
          (simulationSaved)="onSimulationSaved()"
        ></app-simulation-studio>
      }
    </div>
  `,
  styles: [
    `
      .simulation-page-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px 16px 48px 16px;
      }
      .top-nav-bar {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
      }
      .back-btn {
        font-weight: 500;
        color: #475569;
      }
      .context-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px 20px;
        margin-bottom: 24px;
      }
      .context-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      .context-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .context-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .page-title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
      }
      .company-pill {
        font-size: 13px;
        font-weight: 600;
        color: #1d4ed8;
        background-color: #eff6ff;
        border: 1px solid #bfdbfe;
        padding: 2px 10px;
        border-radius: 12px;
      }
      .context-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 13px;
        color: #64748b;
      }
      .plan-chip {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 14px;
      }
      .plan-label {
        font-size: 11px;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.5px;
      }
      .plan-value {
        font-size: 14px;
        font-weight: 700;
        color: #2563eb;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationPageComponent implements OnInit {
  // Input bound from route parameter :customerId via withComponentInputBinding()
  readonly customerId = input<string>();

  private readonly customerService = inject(CustomerApiService);
  private readonly catalogService = inject(CatalogApiService);
  private readonly router = inject(Router);

  readonly customer = signal<Customer | null>(null);
  readonly plans = signal<PlanInfo[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);

  readonly activePlan = computed<PlanInfo | null>(() => {
    const cust = this.customer();
    if (!cust) {
      return null;
    }
    return this.plans().find((p) => p.code === cust.plan) || null;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const id = parseInt(this.customerId() || '0', 10);
    if (!id) {
      this.errorMessage.set('Identificador de cliente no válido.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      customer: this.customerService.getCustomerById(id),
      plans: this.catalogService.getPlans(),
    }).subscribe({
      next: ({ customer, plans }) => {
        this.customer.set(customer);
        this.plans.set(plans);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.message || 'Error al cargar los datos necesarios para la simulación.'
        );
      },
    });
  }

  onSimulationSaved(): void {
    const id = this.customer()?.id ?? this.customerId();
    this.router.navigate(['/customers', id]);
  }

  goBackToCustomer(): void {
    const id = this.customer()?.id ?? this.customerId();
    this.router.navigate(['/customers', id]);
  }
}

