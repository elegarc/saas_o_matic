import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon class="title-icon">help_outline</mat-icon>
      <span>{{ data.title }}</span>
    </h2>

    <mat-dialog-content>
      <p class="dialog-message">{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="dialogRef.close(false)">
        {{ data.cancelLabel || 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        [color]="data.isDestructive ? 'warn' : 'primary'"
        (click)="dialogRef.close(true)"
      >
        {{ data.confirmLabel || 'Aceptar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #0f172a;
      }
      .title-icon {
        color: #d97706;
      }
      .dialog-message {
        margin: 12px 0;
        color: #475569;
        font-size: 14px;
        line-height: 1.5;
      }
      .dialog-actions {
        padding: 12px 0 0 0;
        gap: 8px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

