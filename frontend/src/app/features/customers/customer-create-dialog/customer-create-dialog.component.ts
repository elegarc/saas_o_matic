import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { CountryInfo, OveragePolicy, PlanCode, PlanInfo } from '../../../core/models/catalog.model';
import { CatalogApiService } from '../../../core/services/catalog-api.service';
import { CustomerApiService } from '../../../core/services/customer-api.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

// Spanish Tax ID algorithms mirroring backend exactly
const DNI_TABLE = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_MAP: Record<string, string> = { X: '0', Y: '1', Z: '2' };
const CIF_LETTERS = 'JABCDEFGHI';

function isValidSpanishTaxId(raw: string): boolean {
  const cleaned = raw.replace(/[\s.-]+/g, '').toUpperCase();
  if (cleaned.length !== 9) {
    return false;
  }

  // DNI
  if (/^[0-9]{8}[A-Z]$/.test(cleaned)) {
    const num = parseInt(cleaned.slice(0, 8), 10);
    return cleaned[8] === DNI_TABLE[num % 23];
  }

  // NIE
  if (/^[XYZ][0-9]{7}[A-Z]$/.test(cleaned)) {
    const prefix = NIE_MAP[cleaned[0]];
    const num = parseInt(prefix + cleaned.slice(1, 8), 10);
    return cleaned[8] === DNI_TABLE[num % 23];
  }

  // CIF
  if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(cleaned)) {
    const prefix = cleaned[0];
    const digits = cleaned.slice(1, 8).split('').map(Number);
    const controlChar = cleaned[8];

    const evenSum = digits[1] + digits[3] + digits[5];
    let oddSum = 0;
    for (const idx of [0, 2, 4, 6]) {
      const doubled = digits[idx] * 2;
      oddSum += Math.floor(doubled / 10) + (doubled % 10);
    }
    const controlDigit = (10 - ((evenSum + oddSum) % 10)) % 10;
    const expDigit = controlDigit.toString();
    const expLetter = CIF_LETTERS[controlDigit];

    if ('ABEH'.includes(prefix)) {
      return controlChar === expDigit;
    }
    if ('PQRSNW'.includes(prefix)) {
      return controlChar === expLetter;
    }
    return controlChar === expDigit || controlChar === expLetter;
  }

  return false;
}

@Component({
  selector: 'app-customer-create-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">domain_add</mat-icon>
        <span>Registrar Nuevo Cliente Corporativo</span>
      </h2>
      <button mat-icon-button (click)="handleCloseAttempt()" aria-label="Cerrar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      @if (errorMessage()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <form [formGroup]="form" class="customer-form">
        <mat-form-field appearance="outline" class="form-field full-width">
          <mat-label>Nombre de la Empresa</mat-label>
          <input
            matInput
            formControlName="company_name"
            placeholder="Ej: Acme Iberia S.L."
            maxlength="150"
          />
          <mat-icon matPrefix class="field-icon">business</mat-icon>
          @if (form.controls.company_name.hasError('required')) {
            <mat-error>El nombre de la empresa es obligatorio.</mat-error>
          } @else if (form.controls.company_name.hasError('minlength')) {
            <mat-error>Debe contener al menos 2 caracteres.</mat-error>
          }
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="form-field half-width">
            <mat-label>País</mat-label>
            <mat-select formControlName="country_code">
              @for (country of countries(); track country.country_code) {
                <mat-option [value]="country.country_code">
                  {{ country.name }} ({{ country.tax_rate_percent }}% IVA)
                </mat-option>
              }
            </mat-select>
            <mat-icon matPrefix class="field-icon">public</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="form-field half-width">
            <mat-label>
              {{ isSpainSelected ? 'CIF / NIF / DNI' : 'Identificador Fiscal (Tax ID)' }}
            </mat-label>
            <input
              matInput
              formControlName="tax_id"
              placeholder="Ej: B58818501"
              maxlength="20"
            />
            <mat-icon matPrefix class="field-icon">badge</mat-icon>
            @if (form.controls.tax_id.hasError('required')) {
              <mat-error>El identificador fiscal es obligatorio.</mat-error>
            } @else if (form.controls.tax_id.hasError('invalidSpanishTaxId')) {
              <mat-error>CIF/DNI/NIE español no válido según algoritmo de control.</mat-error>
            } @else if (form.controls.tax_id.hasError('invalidTaxId')) {
              <mat-error>Debe tener entre 5 y 20 caracteres alfanuméricos.</mat-error>
            }
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="form-field full-width">
          <mat-label>Email de Contacto Comercial / Facturación</mat-label>
          <input
            matInput
            type="email"
            formControlName="contact_email"
            placeholder="billing@empresa.com"
            maxlength="254"
          />
          <mat-icon matPrefix class="field-icon">email</mat-icon>
          @if (form.controls.contact_email.hasError('required')) {
            <mat-error>El email de contacto es obligatorio.</mat-error>
          } @else if (form.controls.contact_email.hasError('email')) {
            <mat-error>Introduzca un formato de email válido.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="form-field full-width">
          <mat-label>Plan Contratado</mat-label>
          <mat-select formControlName="plan">
            @for (plan of plans(); track plan.code) {
              <mat-option [value]="plan.code">
                {{ plan.name }} — {{ plan.fixed_monthly_eur }} €/mes ({{ plan.included_storage_gb }} GB / {{ plan.included_api_calls }} llamadas)
              </mat-option>
            }
          </mat-select>
          <mat-icon matPrefix class="field-icon">layers</mat-icon>
        </mat-form-field>

        <div class="policy-section">
          <label class="section-label">Política por defecto ante Excedentes:</label>
          <mat-radio-group formControlName="overage_policy" class="policy-radio-group">
            <mat-radio-button [value]="OveragePolicy.PROGRESSIVE">
              <span class="policy-title">Tarificación Progresiva</span>
              <span class="policy-desc">Permite superar límites de almacenamiento y API aplicando tramos graduales.</span>
            </mat-radio-button>
            <mat-radio-button [value]="OveragePolicy.HARD_CAP">
              <span class="policy-title">Bloqueo Estricto (HARD_CAP)</span>
              <span class="policy-desc">No permite exceder los umbrales del plan contratado.</span>
            </mat-radio-button>
          </mat-radio-group>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="handleCloseAttempt()" [disabled]="isSubmitting()">
        Cancelar
      </button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || isSubmitting()"
        (click)="onSubmit()"
      >
        @if (isSubmitting()) {
          <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
        } @else {
          <mat-icon>check</mat-icon>
        }
        <span>{{ isSubmitting() ? 'Guardando...' : 'Registrar Cliente' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px 0 24px;
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #0f172a;
      }
      .title-icon {
        color: #2563eb;
      }
      .dialog-content {
        padding: 16px 24px 8px 24px !important;
        max-width: 580px;
      }
      .customer-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-row {
        display: flex;
        gap: 16px;
      }
      .half-width {
        flex: 1;
      }
      .full-width {
        width: 100%;
      }
      .field-icon {
        color: #64748b;
        margin-right: 6px;
      }
      .policy-section {
        margin: 8px 0;
        padding: 12px 16px;
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      .section-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .policy-radio-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .policy-title {
        font-size: 13px;
        font-weight: 500;
        color: #0f172a;
      }
      .policy-desc {
        display: block;
        font-size: 12px;
        color: #64748b;
      }
      .dialog-actions {
        padding: 12px 24px 16px 24px;
        gap: 8px;
      }
      .error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        margin-bottom: 12px;
        font-size: 13px;
      }
      .btn-spinner {
        display: inline-block;
        margin-right: 6px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreateDialogComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CustomerCreateDialogComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly catalogService = inject(CatalogApiService);
  private readonly customerService = inject(CustomerApiService);

  readonly OveragePolicy = OveragePolicy;

  readonly countries = signal<CountryInfo[]>([]);
  readonly plans = signal<PlanInfo[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    company_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    country_code: ['ES', [Validators.required]],
    tax_id: ['', [Validators.required, (c: AbstractControl) => this.validateTaxId(c)]],
    contact_email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    plan: [PlanCode.STARTER, [Validators.required]],
    overage_policy: [OveragePolicy.PROGRESSIVE, [Validators.required]],
  });

  get isSpainSelected(): boolean {
    return this.form.controls.country_code.value === 'ES';
  }

  ngOnInit(): void {
    // Disable automatic dialog close on backdrop click or escape to handle dirty guard
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => this.handleCloseAttempt());
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.handleCloseAttempt();
      }
    });

    this.catalogService.getCountries().subscribe({
      next: (data) => this.countries.set(data),
      error: () => this.errorMessage.set('Error al cargar la lista de países.'),
    });

    this.catalogService.getPlans().subscribe({
      next: (data) => this.plans.set(data),
      error: () => this.errorMessage.set('Error al cargar la lista de planes.'),
    });

    this.form.controls.country_code.valueChanges.subscribe(() => {
      this.form.controls.tax_id.updateValueAndValidity();
    });
  }

  private validateTaxId(control: AbstractControl): ValidationErrors | null {
    const val = control.value;
    if (!val) {
      return null;
    }
    const country = this.form ? this.form.controls.country_code.value : 'ES';
    if (country === 'ES') {
      return isValidSpanishTaxId(val) ? null : { invalidSpanishTaxId: true };
    }
    const cleaned = val.replace(/[\s.-]+/g, '');
    return /^[A-Za-z0-9]{5,20}$/.test(cleaned) ? null : { invalidTaxId: true };
  }

  handleCloseAttempt(): void {
    if (this.form.dirty) {
      const confirmRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: '¿Descartar cambios?',
          message:
            'Los datos introducidos en el formulario se perderán si cierra ahora. ¿Está seguro de que desea salir?',
          confirmLabel: 'Descartar y salir',
          cancelLabel: 'Continuar editando',
          isDestructive: true,
        },
      });

      confirmRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.dialogRef.close();
        }
      });
    } else {
      this.dialogRef.close();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValues = this.form.getRawValue();

    this.customerService.createCustomer(formValues).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.dialogRef.close(created);
      },
      error: (err: Error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.message || 'Error al registrar el cliente.');
      },
    });
  }
}

