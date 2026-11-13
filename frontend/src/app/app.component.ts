import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CurrencyExchangeService } from './core/services/currency-exchange.service';
import { CurrencySelectorComponent } from './shared/components/currency-selector/currency-selector.component';
import { StatusBannerComponent } from './shared/components/status-banner/status-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    CurrencySelectorComponent,
    StatusBannerComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly currencyService = inject(CurrencyExchangeService);

  readonly activeCurrency = this.currencyService.activeCurrency;
  readonly currencies = this.currencyService.defaultCurrencies;
  readonly currencyState = this.currencyService.state;
  readonly lastUpdated = this.currencyService.lastUpdated;

  onCurrencyChange(code: string): void {
    this.currencyService.setCurrency(code);
  }

  onRetryCurrency(): void {
    this.currencyService.fetchRates();
  }
}
