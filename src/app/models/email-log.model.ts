/**
 * Email Log Model
 *
 * Defines the types and interfaces for email tracking functionality.
 * Used for sending budget PDFs to customers and tracking email history.
 */

/**
 * Status of an email in the system
 */
export type EmailStatus = 'pending' | 'sent' | 'failed';

/**
 * Maximum allowed PDF size for email attachments (in MB)
 * Resend has a 40MB limit for attachments
 */
export const MAX_PDF_SIZE_MB = 40;

/**
 * Email log entry as stored in the database
 */
export interface EmailLog {
  id: number;
  budgetId: number | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  bodyText: string;
  status: EmailStatus;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Payload for sending a budget email via the Edge Function
 */
export interface SendBudgetEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyText: string;
  pdfBase64: string;
  budgetNumber: string;
  budgetId: number;
}

/**
 * Response from the send-budget-email Edge Function
 */
export interface SendEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  log: EmailLog;
}

/**
 * Filters for querying email logs
 */
export interface EmailLogFilters {
  status?: EmailStatus;
  searchEmail?: string;
}

/**
 * Paginated response for email logs
 */
export interface EmailLogsPaginatedResponse {
  logs: EmailLog[];
  total: number;
}

/**
 * Data passed to the send email dialog
 */
export interface SendEmailDialogData {
  customerEmail?: string | null;
  customerName?: string | null;
  budgetNumber: string;
  budgetTitle: string;
  budgetId: number;
  /** Pre-fill data for retry functionality */
  prefillData?: {
    email: string;
    subject: string;
    bodyText: string;
  };
}

/**
 * Result returned when the send email dialog closes
 */
export interface SendEmailDialogResult {
  success: boolean;
  log?: EmailLog;
  error?: string;
}

/**
 * Default email body template generator
 */
export function generateDefaultEmailBody(customerName?: string | null, budgetNumber?: string): string {
  const greeting = customerName ? `Estimado/a ${customerName}` : 'Estimado/a cliente';

  return `${greeting},

Adjunto encontrará el presupuesto ${budgetNumber || ''} solicitado.

Si tiene alguna pregunta o necesita información adicional, no dude en ponerse en contacto con nosotros.

Quedamos a su disposición para cualquier consulta.

Saludos cordiales`;
}

/**
 * Default email subject generator
 */
export function generateDefaultEmailSubject(budgetNumber?: string, budgetTitle?: string): string {
  const parts = ['Presupuesto'];

  if (budgetNumber) {
    parts.push(budgetNumber);
  }

  if (budgetTitle) {
    parts.push(`- ${budgetTitle}`);
  }

  return parts.join(' ');
}
