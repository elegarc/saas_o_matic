import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-status-banner',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="banner-container" [class]="type()">
      <div class="banner-message-wrapper">
        <mat-icon class="banner-icon">{{ getIcon() }}</mat-icon>
        <span class="banner-message">{{ message() }}</span>
      </div>
      @if (actionLabel()) {
        <button mat-button class="banner-action-btn" (click)="actionClick.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .banner-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-radius: 6px;
        margin: 12px 0;
        font-size: 13px;
        line-height: 1.4;
      }
      .banner-message-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .banner-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .banner-message {
        font-weight: 500;
      }
      .banner-action-btn {
        font-weight: 600;
        text-transform: none;
        margin-left: 12px;
      }

      .info {
        background-color: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
      }
      .warning {
        background-color: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .error {
        background-color: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
      .success {
        background-color: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBannerComponent {
  readonly message = input.required<string>();
  readonly type = input<'info' | 'warning' | 'error' | 'success'>('warning');
  readonly actionLabel = input<string | null>(null);

  readonly actionClick = output<void>();

  getIcon(): string {
    switch (this.type()) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error_outline';
      case 'success':
        return 'check_circle';
      default:
        return 'info';
    }
  }
}

