import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SimulationBreakdown } from '../../../core/models/simulation.model';
import { CurrencyConvertPipe } from '../../pipes/currency-convert.pipe';

@Component({
  selector: 'app-cost-breakdown-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CurrencyConvertPipe,
  ],
  template: `
    <mat-card class="breakdown-card" appearance="outlined">
      <mat-card-header class="breakdown-header">
        <mat-card-title class="card-title">
          <mat-icon class="title-icon">receipt_long</mat-icon>
          <span>Resumen de Facturación</span>
        </mat-card-title>
        @if (targetCurrency() !== 'EUR') {
          <span class="rate-badge">
            1 EUR = {{ exchangeRate().toFixed(4) }} {{ targetCurrency() }}
          </span>
        }
      </mat-card-header>

      <mat-card-content class="card-body">
        @if (isHardCapExceeded()) {
          <div class="hard-cap-alert">
            <mat-icon class="alert-icon">block</mat-icon>
            <div class="alert-text">
              <strong>Límite de Plan Excedido</strong>
              <span>{{ hardCapErrorMessage() }}</span>
            </div>
          </div>
        }

        <div class="breakdown-list">
          <div class="line-item">
            <span class="item-name">
              Cuota Fija Plan ({{ planName() || 'Plan Base' }})
            </span>
            <span class="item-value">
              {{ breakdown().plan_fixed_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          <div class="line-item">
            <span class="item-name">
              Coste Usuarios ({{ activeUsers() }} activos)
            </span>
            <span class="item-value">
              {{ breakdown().users_cost_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          <div class="line-item">
            <span class="item-name">
              Exceso Almacenamiento ({{ breakdown().extra_storage_gb }} GB extra)
            </span>
            <span class="item-value" [class.overage]="breakdown().extra_storage_cost_eur > 0">
              {{ breakdown().extra_storage_cost_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          <div class="line-item">
            <span class="item-name">
              Exceso Llamadas API ({{ breakdown().extra_api_calls }} extra)
            </span>
            <span class="item-value" [class.overage]="breakdown().extra_api_cost_eur > 0">
              {{ breakdown().extra_api_cost_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          <mat-divider class="divider"></mat-divider>

          <div class="line-item subtotal-row">
            <span class="item-name">Subtotal Base</span>
            <span class="item-value">
              {{ breakdown().subtotal_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          <div class="line-item tax-row">
            <span class="item-name">
              Impuestos / IVA ({{ breakdown().tax_rate_percent }}%)
            </span>
            <span class="item-value">
              {{ breakdown().tax_amount_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          <mat-divider class="divider thick-divider"></mat-divider>

          <div class="line-item total-eur-row">
            <span class="total-label">TOTAL FACTURA MENSUAL</span>
            <span class="total-amount">
              {{ breakdown().total_eur | currencyConvert: 'EUR' }}
            </span>
          </div>

          @if (targetCurrency() !== 'EUR') {
            <div class="converted-total-container">
              <span class="converted-label">Equivalente en {{ targetCurrency() }}:</span>
              <span class="converted-amount">
                {{ breakdown().total_eur | currencyConvert: targetCurrency() : exchangeRate() }}
              </span>
            </div>
          }
        </div>
      </mat-card-content>

      @if (showSaveButton()) {
        <mat-card-actions class="card-actions">
          <button
            mat-flat-button
            color="primary"
            class="save-btn"
            [disabled]="isHardCapExceeded() || isSaving()"
            (click)="saveSimulation.emit()"
          >
            @if (isSaving()) {
              <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
            } @else {
              <mat-icon>save</mat-icon>
            }
            <span>{{ isSaving() ? 'Guardando...' : 'Guardar' }}</span>
          </button>
        </mat-card-actions>
      }
    </mat-card>
  `,
  styles: [
    `
      .breakdown-card {
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05);
      }
      .breakdown-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
      }
      .title-icon {
        color: #2563eb;
      }
      .rate-badge {
        font-size: 11px;
        background-color: #f1f5f9;
        color: #475569;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 500;
      }
      .card-body {
        padding: 16px 20px !important;
      }
      .hard-cap-alert {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        margin-bottom: 14px;
        font-size: 13px;
      }
      .alert-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .alert-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .breakdown-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .line-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        color: #334155;
      }
      .item-name {
        color: #475569;
      }
      .item-value {
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
      .overage {
        color: #ea580c;
        font-weight: 600;
      }
      .divider {
        margin: 6px 0;
      }
      .subtotal-row {
        font-weight: 600;
        color: #0f172a;
      }
      .tax-row {
        font-size: 13px;
        color: #64748b;
      }
      .thick-divider {
        border-top-width: 2px;
        border-top-color: #cbd5e1;
      }
      .total-eur-row {
        padding-top: 4px;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
      .total-label {
        letter-spacing: 0.5px;
      }
      .total-amount {
        font-size: 18px;
        color: #0f172a;
      }
      .converted-total-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
        padding: 10px 14px;
        background-color: #eff6ff;
        border: 1px solid #dbeafe;
        border-radius: 6px;
      }
      .converted-label {
        font-size: 13px;
        font-weight: 500;
        color: #1e40af;
      }
      .converted-amount {
        font-size: 18px;
        font-weight: 700;
        color: #1d4ed8;
        font-variant-numeric: tabular-nums;
      }
      .card-actions {
        padding: 12px 20px 16px 20px;
      }
      .save-btn {
        width: 100%;
        height: 42px;
        font-size: 14px;
        font-weight: 600;
      }
      .btn-spinner {
        display: inline-block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostBreakdownCardComponent {
  readonly breakdown = input.required<SimulationBreakdown>();
  readonly planName = input<string>('');
  readonly activeUsers = input<number>(0);
  readonly targetCurrency = input<string>('EUR');
  readonly exchangeRate = input<number>(1.0);
  readonly isHardCapExceeded = input<boolean>(false);
  readonly hardCapErrorMessage = input<string | null>(null);
  readonly showSaveButton = input<boolean>(true);
  readonly isSaving = input<boolean>(false);

  readonly saveSimulation = output<void>();
}

