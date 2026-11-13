import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="loading-container">
      <mat-spinner diameter="40"></mat-spinner>
      <p class="loading-label">{{ message() }}</p>
    </div>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        color: #64748b;
      }
      .loading-label {
        margin-top: 16px;
        font-size: 14px;
        font-weight: 500;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  readonly message = input<string>('Cargando información...');
}

