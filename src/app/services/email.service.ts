import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  EmailLog,
  EmailLogFilters,
  EmailLogsPaginatedResponse,
  SendBudgetEmailPayload,
  SendEmailResponse
} from '../models/email-log.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Sends a budget email with PDF attachment via the Edge Function.
   * The Edge Function handles the actual email sending and logs the result.
   *
   * @param payload Email data including recipient, subject, body, and PDF
   * @returns The created email log entry
   * @throws Error if the Edge Function call fails
   */
  async sendBudgetEmail(payload: SendBudgetEmailPayload): Promise<EmailLog> {
    try {
      const { data, error } = await this.supabase.client.functions.invoke<SendEmailResponse>(
        'send-budget-email',
        {
          body: payload
        }
      );

      if (error) {
        console.error('Error invoking send-budget-email function:', error);
        console.error('Error details:', {
          message: error.message,
          context: error.context,
          name: error.name
        });

        // Try to extract more details from the error context (Response object)
        let errorMessage = 'Error al conectar con el servicio de email';

        if (error.context && error.context instanceof Response) {
          try {
            // Clone the response to avoid consuming it
            const responseClone = error.context.clone();
            const responseText = await responseClone.text();
            console.error('Response body:', responseText);

            // Try to parse as JSON
            try {
              const responseJson = JSON.parse(responseText);
              console.error('Response JSON:', responseJson);

              if (responseJson.error) {
                errorMessage = responseJson.error;
                if (responseJson.details) {
                  errorMessage += ` (${responseJson.details})`;
                }
              }
            } catch (jsonError) {
              // Not JSON, use text as is
              if (responseText && responseText.length < 200) {
                errorMessage = responseText;
              }
            }
          } catch (readError) {
            console.error('Could not read response body:', readError);
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      console.log('Email service response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Error desconocido al enviar el email');
      }

      return data.log;
    } catch (error) {
      console.error('Exception in sendBudgetEmail:', error);
      throw error;
    }
  }

  /**
   * Gets email logs, optionally filtered by budget ID.
   *
   * @param limit Maximum number of logs to return (default: 50)
   * @param offset Number of logs to skip for pagination (default: 0)
   * @param filters Optional filters for status and email search
   * @param budgetId Optional budget ID to filter by
   * @returns Paginated response with logs array and total count
   */
  async getEmailLogs(
    limit = 50,
    offset = 0,
    filters?: EmailLogFilters,
    budgetId?: number
  ): Promise<EmailLogsPaginatedResponse> {
    // Build the query
    let query = this.supabase.client
      .from('EmailLogs')
      .select('*', { count: 'exact' });

    // Apply budget filter if provided
    if (budgetId) {
      query = query.eq('budgetId', budgetId);
    }

    // Apply status filter if provided
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Apply email search filter if provided (case-insensitive partial match)
    if (filters?.searchEmail) {
      query = query.ilike('recipientEmail', `%${filters.searchEmail}%`);
    }

    // Apply ordering and pagination
    query = query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching email logs:', error);
      throw new Error('Error al obtener el historial de emails');
    }

    return {
      logs: (data as EmailLog[]) || [],
      total: count || 0
    };
  }

  /**
   * Gets a single email log by ID.
   *
   * @param emailLogId The email log ID to retrieve
   * @returns The email log entry or null if not found
   */
  async getEmailLogById(emailLogId: number): Promise<EmailLog | null> {
    const { data, error } = await this.supabase.client
      .from('EmailLogs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Error fetching email log:', error);
      throw new Error('Error al obtener el registro de email');
    }

    return data as EmailLog;
  }
}
