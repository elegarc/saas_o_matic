import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { resetMockDemoData } from './core/interceptors/mock-api.interceptor';
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
  private readonly document = inject(DOCUMENT);
  readonly currencyService = inject(CurrencyExchangeService);

  readonly isDemoMode = environment.useMockApi;
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

  onResetDemoData(): void {
    resetMockDemoData();
    this.document.location.href = this.document.baseURI;
  }
}
