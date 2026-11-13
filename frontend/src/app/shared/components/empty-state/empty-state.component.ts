import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <mat-card class="empty-card" appearance="outlined">
      <mat-card-content class="empty-content">
        <mat-icon class="empty-icon">{{ icon() }}</mat-icon>
        <h3 class="empty-title">{{ title() }}</h3>
        @if (subtitle()) {
          <p class="empty-subtitle">{{ subtitle() }}</p>
        }
        @if (actionLabel()) {
          <button mat-flat-button color="primary" class="action-btn" (click)="actionClick.emit()">
            {{ actionLabel() }}
          </button>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .empty-card {
        background-color: #ffffff;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        margin: 16px 0;
      }
      .empty-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 40px 24px !important;
      }
      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #94a3b8;
        margin-bottom: 12px;
      }
      .empty-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
      }
      .empty-subtitle {
        margin: 8px 0 0 0;
        font-size: 14px;
        color: #64748b;
        max-width: 420px;
      }
      .action-btn {
        margin-top: 20px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input<string>('inbox');
  readonly title = input<string>('No se encontraron datos');
  readonly subtitle = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);

  readonly actionClick = output<void>();
}

