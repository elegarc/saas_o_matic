import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CurrencyState } from '../../../core/models/currency.model';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  template: `
    <div class="currency-selector-container">
      <div
        class="status-pill"
        [class]="state()"
        [matTooltip]="getTooltipText()"
        matTooltipPosition="below"
      >
        <span class="status-dot">●</span>
        <span class="status-label">{{ getStatusLabel() }}</span>
      </div>

      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="select-field">
        <mat-label>Divisa</mat-label>
        <mat-select
          [value]="selectedCurrency()"
          [disabled]="state() === 'offline_eur_only'"
          (selectionChange)="currencyChange.emit($event.value)"
        >
          @for (cur of currencies(); track cur) {
            <mat-option [value]="cur">{{ cur }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (state() === 'cached_fallback' || state() === 'offline_eur_only') {
        <button
          mat-icon-button
          color="primary"
          class="retry-btn"
          matTooltip="Reintentar conexión con servicio de tipos de cambio"
          (click)="retryClick.emit()"
        >
          <mat-icon>refresh</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .currency-selector-container {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 0;
      }
      .select-field {
        width: 128px;
        --mat-form-field-container-height: 44px;
        --mat-form-field-container-vertical-padding: 10px;
        --mat-form-field-outlined-container-shape: 8px;
      }
      :host ::ng-deep .select-field .mat-mdc-form-field-infix {
        padding-left: 4px;
        padding-right: 4px;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: default;
        user-select: none;
      }
      .status-dot {
        font-size: 9px;
      }
      .live {
        background-color: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }
      .loading {
        background-color: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }
      .cached_fallback {
        background-color: #fef3c7;
        color: #b45309;
        border: 1px solid #fde68a;
      }
      .offline_eur_only {
        background-color: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .retry-btn {
        width: 36px;
        height: 36px;
        padding: 0;
        --mdc-icon-button-state-layer-size: 36px;
      }
      .retry-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySelectorComponent {
  readonly currencies = input<string[]>(['EUR', 'USD', 'GBP', 'CHF', 'MXN', 'COP']);
  readonly selectedCurrency = input.required<string>();
  readonly state = input<CurrencyState>('loading');
  readonly lastUpdated = input<Date | null>(null);

  readonly currencyChange = output<string>();
  readonly retryClick = output<void>();

  getStatusLabel(): string {
    switch (this.state()) {
      case 'live':
        return 'En vivo';
      case 'cached_fallback':
        return 'Caché';
      case 'offline_eur_only':
        return 'Offline';
      case 'loading':
      default:
        return 'Cargando...';
    }
  }

  getTooltipText(): string {
    const updated = this.lastUpdated();
    const dateStr = updated ? updated.toLocaleTimeString('es-ES') : 'recientemente';

    switch (this.state()) {
      case 'live':
        return `Tipos de cambio actualizados en vivo (${dateStr})`;
      case 'cached_fallback':
        return `Sin conexión en vivo. Mostrando tipos guardados (${dateStr}). Pulse refrescar para reintentar.`;
      case 'offline_eur_only':
        return 'Sin conexión y sin caché disponible. Visualización bloqueada en EUR.';
      case 'loading':
      default:
        return 'Consultando tipos de cambio de open.er-api.com...';
    }
  }
}

