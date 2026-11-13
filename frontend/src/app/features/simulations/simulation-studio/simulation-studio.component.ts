import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OveragePolicy, PlanInfo } from '../../../core/models/catalog.model';
import { Customer } from '../../../core/models/customer.model';
import { Simulation } from '../../../core/models/simulation.model';
import { CurrencyExchangeService } from '../../../core/services/currency-exchange.service';
import { SimulationApiService } from '../../../core/services/simulation-api.service';
import { calculateSimulationBreakdown } from '../../../core/utils/pricing-calculator';
import { CostBreakdownCardComponent } from '../../../shared/components/cost-breakdown-card/cost-breakdown-card.component';

@Component({
  selector: 'app-simulation-studio',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    CostBreakdownCardComponent,
  ],
  template: `
    <div class="studio-layout">
      <!-- Left Column: Interactive Configuration Sliders -->
      <div class="controls-column">
        <mat-card class="studio-card" appearance="outlined">
          <mat-card-header class="card-header">
            <mat-card-title class="section-title">
              <mat-icon class="title-icon">tune</mat-icon>
              <span>1. Configuración de Consumo Estimado</span>
            </mat-card-title>
          </mat-card-header>

          <mat-card-content class="card-content">
            <!-- Active Users Control -->
            <div class="control-block">
              <div class="control-label-row">
                <span class="control-title">Usuarios Activos Mensuales</span>
                <div class="numeric-input-wrapper">
                  <input
                    type="number"
                    class="numeric-input"
                    [formControl]="usersControl"
                    min="0"
                    max="500"
                  />
                  <span class="unit-label">usuarios</span>
                </div>
              </div>

              <div class="slider-wrapper">
                <mat-slider min="0" max="150" step="1" discrete class="custom-slider">
                  <input
                    matSliderThumb
                    [value]="usersSliderValue()"
                    (input)="onUsersSliderInput($event)"
                  />
                </mat-slider>
                <div class="slider-hints">
                  <span>0 usrs</span>
                  <span class="tier-mark">10 (10 €/u)</span>
                  <span class="tier-mark">50 (8 €/u)</span>
                  <span>150 usrs</span>
                </div>
              </div>

              @if (usersControl.value > 150) {
                <div class="manual-notice">
                  <mat-icon class="notice-icon">info</mat-icon>
                  <span>
                    Valor introducido manualmente: {{ usersControl.value }} usuarios (Tramo 3 aplicado: 5 € / usuario para > 50).
                  </span>
                </div>
              }

              <div class="tier-breakdown-box">
                <div class="tier-row" [class.active-tier]="usersControl.value > 0">
                  <span class="tier-label">• Tramo 1 (0 a 10 usuarios):</span>
                  <span class="tier-calc">
                    {{ getTier1Count() }} usuarios × 10,00 € = {{ getTier1Cost() | number: '1.2-2' }} €
                  </span>
                </div>
                <div class="tier-row" [class.active-tier]="usersControl.value > 10">
                  <span class="tier-label">• Tramo 2 (11 a 50 usuarios):</span>
                  <span class="tier-calc">
                    {{ getTier2Count() }} usuarios × 8,00 € = {{ getTier2Cost() | number: '1.2-2' }} €
                  </span>
                </div>
                <div class="tier-row" [class.active-tier]="usersControl.value > 50">
                  <span class="tier-label">• Tramo 3 (> 50 usuarios):</span>
                  <span class="tier-calc">
                    {{ getTier3Count() }} usuarios × 5,00 € = {{ getTier3Cost() | number: '1.2-2' }} €
                  </span>
                </div>
              </div>
            </div>

            <!-- Storage Control -->
            <div class="control-block">
              <div class="control-label-row">
                <div class="title-with-badge">
                  <span class="control-title">Almacenamiento Contratado</span>
                  <span class="quota-badge">
                    ✓ {{ plan().included_storage_gb }} GB incluidos
                  </span>
                </div>
                <div class="numeric-input-wrapper">
                  <input
                    type="number"
                    class="numeric-input"
                    [formControl]="storageControl"
                    min="0"
                    max="100000"
                  />
                  <span class="unit-label">GB</span>
                </div>
              </div>

              <div class="slider-wrapper">
                <mat-slider
                  min="0"
                  [max]="getStorageSliderMax()"
                  step="5"
                  discrete
                  class="custom-slider"
                >
                  <input
                    matSliderThumb
                    [value]="storageControl.value"
                    (input)="onStorageSliderInput($event)"
                  />
                </mat-slider>
                <div class="slider-hints">
                  <span>0 GB</span>
                  <span class="plan-included-mark">{{ plan().included_storage_gb }} GB (Plan)</span>
                  <span>{{ getStorageSliderMax() }} GB</span>
                </div>
              </div>

              <div class="usage-summary-row">
                @if (extraStorageGb() > 0) {
                  <span class="overage-tag">
                    ⚠ Exceso: {{ extraStorageGb() }} GB adicionales
                    @if (policyControl.value === OveragePolicy.HARD_CAP) {
                      <strong class="blocked-badge">(BLOQUEADO POR HARD_CAP)</strong>
                    }
                  </span>
                } @else {
                  <span class="included-tag">
                    Consumo dentro del límite incluido (sin sobrecoste).
                  </span>
                }
              </div>
            </div>

            <!-- API Calls Control -->
            <div class="control-block">
              <div class="control-label-row">
                <div class="title-with-badge">
                  <span class="control-title">Llamadas a la API Estimadas / mes</span>
                  <span class="quota-badge">
                    ✓ {{ plan().included_api_calls | number: '1.0-0' }} incluidas
                  </span>
                </div>
                <div class="numeric-input-wrapper">
                  <input
                    type="number"
                    class="numeric-input wide-numeric"
                    [formControl]="apiControl"
                    min="0"
                    max="100000000"
                  />
                  <span class="unit-label">llamadas</span>
                </div>
              </div>

              <div class="slider-wrapper">
                <mat-slider
                  min="0"
                  [max]="getApiSliderMax()"
                  step="10000"
                  discrete
                  class="custom-slider"
                >
                  <input
                    matSliderThumb
                    [value]="apiControl.value"
                    (input)="onApiSliderInput($event)"
                  />
                </mat-slider>
                <div class="slider-hints">
                  <span>0</span>
                  <span class="plan-included-mark">
                    {{ plan().included_api_calls | number: '1.0-0' }} (Plan)
                  </span>
                  <span>{{ getApiSliderMax() | number: '1.0-0' }}</span>
                </div>
              </div>

              <div class="usage-summary-row">
                @if (extraApiCalls() > 0) {
                  <span class="overage-tag">
                    ⚠ Exceso: {{ extraApiCalls() | number: '1.0-0' }} llamadas adicionales
                    @if (policyControl.value === OveragePolicy.HARD_CAP) {
                      <strong class="blocked-badge">(BLOQUEADO POR HARD_CAP)</strong>
                    }
                  </span>
                } @else {
                  <span class="included-tag">
                    Consumo dentro del límite incluido (sin sobrecoste).
                  </span>
                }
              </div>
            </div>

            <!-- Overage Policy Radio Selection -->
            <div class="control-block policy-block">
              <span class="control-title">Política para esta Simulación</span>
              <mat-radio-group [formControl]="policyControl" class="policy-radio-group">
                <mat-radio-button [value]="OveragePolicy.PROGRESSIVE">
                  <div class="policy-text">
                    <span class="radio-name">Progresiva</span>
                    <span class="radio-desc">
                      Permite excesos de consumo aplicando tarifas marginales por tramos crecientes.
                    </span>
                  </div>
                </mat-radio-button>

                <mat-radio-button [value]="OveragePolicy.HARD_CAP">
                  <div class="policy-text">
                    <span class="radio-name">Límite Estricto (HARD_CAP)</span>
                    <span class="radio-desc">
                      Impide guardar simulaciones que superen los umbrales del plan contratado.
                    </span>
                  </div>
                </mat-radio-button>
              </mat-radio-group>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Right Column: Sticky Cost Breakdown Card -->
      <div class="breakdown-column">
        <div class="sticky-container">
          <app-cost-breakdown-card
            [breakdown]="calculation().breakdown"
            [planName]="plan().name"
            [activeUsers]="usersControl.value"
            [targetCurrency]="activeCurrency()"
            [exchangeRate]="activeRate()"
            [isHardCapExceeded]="calculation().isHardCapExceeded"
            [hardCapErrorMessage]="calculation().hardCapErrorMessage"
            [showSaveButton]="true"
            [isSaving]="isSaving()"
            (saveSimulation)="saveSimulation()"
          ></app-cost-breakdown-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .studio-layout {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 24px;
        align-items: start;
      }
      @media (max-width: 900px) {
        .studio-layout {
          grid-template-columns: 1fr;
        }
      }
      .studio-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .card-header {
        padding: 16px 20px 12px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
        margin: 0;
      }
      .title-icon {
        color: #2563eb;
      }
      .card-content {
        padding: 20px !important;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .control-block {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .control-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .title-with-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .control-title {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
      .quota-badge {
        font-size: 11px;
        font-weight: 600;
        color: #15803d;
        background-color: #dcfce7;
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid #bbf7d0;
      }
      .numeric-input-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .numeric-input {
        width: 72px;
        height: 32px;
        padding: 4px 8px;
        font-size: 14px;
        font-weight: 600;
        text-align: right;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        color: #0f172a;
        outline: none;
      }
      .numeric-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 1px #2563eb;
      }
      .wide-numeric {
        width: 100px;
      }
      .unit-label {
        font-size: 12px;
        color: #64748b;
      }
      .slider-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      .custom-slider {
        width: 100%;
      }
      .slider-hints {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
        padding: 0 4px;
      }
      .tier-mark {
        color: #64748b;
      }
      .plan-included-mark {
        color: #15803d;
        font-weight: 600;
      }
      .manual-notice {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #1d4ed8;
        background-color: #eff6ff;
        padding: 6px 10px;
        border-radius: 4px;
      }
      .notice-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .tier-breakdown-box {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
      }
      .tier-row {
        display: flex;
        justify-content: space-between;
        color: #94a3b8;
      }
      .tier-row.active-tier {
        color: #334155;
        font-weight: 500;
      }
      .usage-summary-row {
        font-size: 12px;
      }
      .included-tag {
        color: #16a34a;
        font-weight: 500;
      }
      .overage-tag {
        color: #ea580c;
        font-weight: 600;
      }
      .blocked-badge {
        color: #dc2626;
        margin-left: 4px;
      }
      .policy-block {
        border-top: 1px solid #f1f5f9;
        padding-top: 16px;
      }
      .policy-radio-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 8px;
      }
      .policy-text {
        display: flex;
        flex-direction: column;
      }
      .radio-name {
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
      }
      .radio-desc {
        font-size: 12px;
        color: #64748b;
      }
      .sticky-container {
        position: sticky;
        top: 24px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulationStudioComponent implements OnInit {
  private readonly simulationService = inject(SimulationApiService);
  private readonly currencyService = inject(CurrencyExchangeService);
  private readonly snackBar = inject(MatSnackBar);

  readonly customer = input.required<Customer>();
  readonly plan = input.required<PlanInfo>();

  readonly simulationSaved = output<Simulation>();

  readonly OveragePolicy = OveragePolicy;

  readonly usersControl = new FormControl<number>(15, {
    nonNullable: true,
    validators: [Validators.min(0), Validators.max(500)],
  });

  readonly storageControl = new FormControl<number>(20, {
    nonNullable: true,
    validators: [Validators.min(0), Validators.max(100000)],
  });

  readonly apiControl = new FormControl<number>(80000, {
    nonNullable: true,
    validators: [Validators.min(0), Validators.max(100000000)],
  });

  readonly policyControl = new FormControl<OveragePolicy>(OveragePolicy.PROGRESSIVE, {
    nonNullable: true,
  });

  readonly isSaving = signal<boolean>(false);

  readonly activeCurrency = this.currencyService.activeCurrency;
  readonly activeRate = this.currencyService.activeRate;

  // Track values reactively via signals for calculation
  readonly usersSignal = signal<number>(15);
  readonly storageSignal = signal<number>(20);
  readonly apiSignal = signal<number>(80000);
  readonly policySignal = signal<OveragePolicy>(OveragePolicy.PROGRESSIVE);

  readonly calculation = computed(() => {
    return calculateSimulationBreakdown(
      this.plan(),
      this.customer().tax_rate_percent,
      this.policySignal(),
      this.usersSignal(),
      this.storageSignal(),
      this.apiSignal()
    );
  });

  readonly extraStorageGb = computed(() => {
    return Math.max(0, this.storageSignal() - this.plan().included_storage_gb);
  });

  readonly extraApiCalls = computed(() => {
    return Math.max(0, this.apiSignal() - this.plan().included_api_calls);
  });

  ngOnInit(): void {
    // Sync initial policy from customer record
    const custPolicy = this.customer().overage_policy;
    this.policyControl.setValue(custPolicy);
    this.policySignal.set(custPolicy);

    // Sync form controls to signals for immediate 60fps reactivity
    this.usersControl.valueChanges.subscribe((val) => {
      this.usersSignal.set(Math.max(0, Math.min(500, val || 0)));
    });

    this.storageControl.valueChanges.subscribe((val) => {
      this.storageSignal.set(Math.max(0, val || 0));
    });

    this.apiControl.valueChanges.subscribe((val) => {
      this.apiSignal.set(Math.max(0, val || 0));
    });

    this.policyControl.valueChanges.subscribe((val) => {
      this.policySignal.set(val);
    });
  }

  usersSliderValue(): number {
    return Math.min(150, this.usersControl.value);
  }

  onUsersSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const num = parseInt(input.value, 10);
    this.usersControl.setValue(num);
  }

  onStorageSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const num = parseInt(input.value, 10);
    this.storageControl.setValue(num);
  }

  onApiSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const num = parseInt(input.value, 10);
    this.apiControl.setValue(num);
  }

  getStorageSliderMax(): number {
    return Math.max(500, this.plan().included_storage_gb * 2);
  }

  getApiSliderMax(): number {
    return Math.max(2000000, this.plan().included_api_calls * 2);
  }

  getTier1Count(): number {
    return Math.min(this.usersSignal(), 10);
  }

  getTier1Cost(): number {
    return this.getTier1Count() * 10;
  }

  getTier2Count(): number {
    return Math.max(0, Math.min(this.usersSignal(), 50) - 10);
  }

  getTier2Cost(): number {
    return this.getTier2Count() * 8;
  }

  getTier3Count(): number {
    return Math.max(0, this.usersSignal() - 50);
  }

  getTier3Cost(): number {
    return this.getTier3Count() * 5;
  }

  saveSimulation(): void {
    if (this.calculation().isHardCapExceeded || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    const payload = {
      customer_id: this.customer().id,
      active_users: this.usersControl.value,
      storage_gb: this.storageControl.value,
      estimated_api_calls: this.apiControl.value,
      overage_policy: this.policyControl.value,
    };

    this.simulationService.createSimulation(payload).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        this.snackBar.open('✓ Simulación guardada correctamente.', 'Cerrar', {
          duration: 3500,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
        });
        this.simulationSaved.emit(saved);
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.snackBar.open(
          `Error al guardar la simulación: ${err.message}`,
          'Cerrar',
          { duration: 5000 }
        );
      },
    });
  }
}

