import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  SendEmailDialogData,
  SendEmailDialogResult,
  generateDefaultEmailBody,
  generateDefaultEmailSubject,
  MAX_PDF_SIZE_MB
} from '../../../models/email-log.model';
import { EmailService } from '../../../services/email.service';
import { PdfExportService, BudgetPdfPayload } from '../../../services/pdf-export.service';

@Component({
  selector: 'app-send-email-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Enviar Presupuesto por Email</h2>
        <p class="dialog-subtitle">
          Presupuesto {{ data.budgetNumber }}
          @if (data.budgetTitle) {
            - {{ data.budgetTitle }}
          }
        </p>
      </div>

      <form [formGroup]="emailForm" (ngSubmit)="onSend()" class="dialog-content">
        <div class="form-field">
          <label for="email">Email del destinatario *</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            placeholder="cliente@ejemplo.com"
            [class.invalid]="emailForm.get('email')?.invalid && emailForm.get('email')?.touched"
          />
          @if (emailForm.get('email')?.hasError('required') && emailForm.get('email')?.touched) {
            <span class="error-message">El email es obligatorio</span>
          }
          @if (emailForm.get('email')?.hasError('email') && emailForm.get('email')?.touched) {
            <span class="error-message">Introduce un email válido</span>
          }
        </div>

        <div class="form-field">
          <label for="subject">Asunto *</label>
          <input
            id="subject"
            type="text"
            formControlName="subject"
            placeholder="Asunto del email"
            [class.invalid]="emailForm.get('subject')?.invalid && emailForm.get('subject')?.touched"
          />
          @if (emailForm.get('subject')?.hasError('required') && emailForm.get('subject')?.touched) {
            <span class="error-message">El asunto es obligatorio</span>
          }
        </div>

        <div class="form-field">
          <label for="bodyText">Mensaje *</label>
          <textarea
            id="bodyText"
            formControlName="bodyText"
            rows="8"
            placeholder="Escribe tu mensaje..."
            [class.invalid]="emailForm.get('bodyText')?.invalid && emailForm.get('bodyText')?.touched"
          ></textarea>
          @if (emailForm.get('bodyText')?.hasError('required') && emailForm.get('bodyText')?.touched) {
            <span class="error-message">El mensaje es obligatorio</span>
          }
        </div>

        <div class="pdf-info">
          <span class="material-symbols-rounded">attach_file</span>
          <span>Se adjuntará el PDF del presupuesto automáticamente</span>
        </div>

        @if (errorMessage()) {
          <div class="error-banner">
            <span class="material-symbols-rounded">error</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }
      </form>

      <div class="dialog-actions">
        <button
          type="button"
          class="btn-cancel"
          (click)="onCancel()"
          [disabled]="isSending()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn-send"
          (click)="onSend()"
          [disabled]="emailForm.invalid || isSending()"
        >
          @if (isSending()) {
            <mat-spinner diameter="18"></mat-spinner>
            <span>Enviando...</span>
          } @else {
            <span class="material-symbols-rounded">send</span>
            <span>Enviar Email</span>
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      min-width: 480px;
      max-width: 560px;
    }

    .dialog-header {
      padding: 1.5rem 1.5rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
    }

    .dialog-subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .dialog-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-field label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #374151;
    }

    .form-field input,
    .form-field textarea {
      padding: 0.75rem 1rem;
      border: 1px solid #d1d5db;
      font-size: 0.9375rem;
      color: #111827;
      background: white;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-field input:focus,
    .form-field textarea:focus {
      outline: none;
      border-color: #6b7280;
      box-shadow: 0 0 0 1px rgba(107, 114, 128, 0.2);
    }

    .form-field input.invalid,
    .form-field textarea.invalid {
      border-color: #ef4444;
    }

    .form-field textarea {
      resize: vertical;
      min-height: 120px;
      font-family: inherit;
      line-height: 1.5;
    }

    .error-message {
      font-size: 0.75rem;
      color: #ef4444;
    }

    .pdf-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .pdf-info .material-symbols-rounded {
      font-size: 1.125rem;
      color: #9ca3af;
    }

    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 0.875rem;
    }

    .error-banner .material-symbols-rounded {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .btn-cancel {
      padding: 0.625rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #374151;
      background: white;
      border: 1px solid #d1d5db;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-cancel:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-send {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: white;
      background: #111827;
      border: 1px solid #111827;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-send:hover:not(:disabled) {
      background: #1f2937;
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-send .material-symbols-rounded {
      font-size: 1.125rem;
    }

    .btn-send mat-spinner {
      --mdc-circular-progress-active-indicator-color: white;
    }
  `]
})
export class SendEmailDialogComponent {
  protected readonly data = inject<SendEmailDialogData & { pdfPayload: BudgetPdfPayload }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<SendEmailDialogComponent, SendEmailDialogResult>);
  private readonly emailService = inject(EmailService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly fb = inject(FormBuilder);

  protected readonly isSending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly emailForm: FormGroup;

  constructor() {
    // Initialize form with prefill data (for retries) or default values
    const prefill = this.data.prefillData;

    this.emailForm = this.fb.group({
      email: [
        prefill?.email || this.data.customerEmail || '',
        [Validators.required, Validators.email]
      ],
      subject: [
        prefill?.subject || generateDefaultEmailSubject(this.data.budgetNumber, this.data.budgetTitle),
        Validators.required
      ],
      bodyText: [
        prefill?.bodyText || generateDefaultEmailBody(this.data.customerName, this.data.budgetNumber),
        Validators.required
      ]
    });
  }

  async onSend(): Promise<void> {
    if (this.emailForm.invalid || this.isSending()) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set(null);

    try {
      console.log('Generating PDF...');
      // Generate PDF as base64
      const { base64, sizeInMB } = await this.pdfExportService.getBudgetPdfBase64(this.data.pdfPayload);
      console.log(`PDF generated: ${sizeInMB.toFixed(2)} MB`);

      // Validate PDF size
      if (sizeInMB > MAX_PDF_SIZE_MB) {
        this.errorMessage.set(
          `El PDF es demasiado grande (${sizeInMB.toFixed(2)} MB). El tamaño máximo permitido es ${MAX_PDF_SIZE_MB} MB.`
        );
        this.isSending.set(false);
        return;
      }

      // Send email via Edge Function
      const formValue = this.emailForm.value;
      const payload = {
        recipientEmail: formValue.email,
        recipientName: this.data.customerName || undefined,
        subject: formValue.subject,
        bodyText: formValue.bodyText,
        pdfBase64: base64,
        budgetNumber: this.data.budgetNumber,
        budgetId: this.data.budgetId
      };

      console.log('Sending email with payload:', {
        ...payload,
        pdfBase64: `${base64.substring(0, 50)}... (${base64.length} chars)`
      });

      const log = await this.emailService.sendBudgetEmail(payload);
      console.log('Email sent successfully, log:', log);

      // Close dialog with success result
      this.dialogRef.close({
        success: true,
        log
      });
    } catch (error) {
      console.error('Error sending email:', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Error desconocido al enviar el email'
      );
      this.isSending.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }
}
