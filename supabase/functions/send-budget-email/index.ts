// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendEmailPayload {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  bodyText: string;
  pdfBase64: string;
  budgetNumber: string;
  budgetId: number;
}

interface EmailLogInsert {
  budgetId: number;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  bodyText: string;
  status: "pending" | "sent" | "failed";
  errorMessage: string | null;
  sentAt: string | null;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get environment variables
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "Easy Budgets <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set");
      return new Response(
        JSON.stringify({
          error: "El servicio de email no está configurado. Por favor, configura RESEND_API_KEY en los secrets de Supabase.",
          details: "Missing RESEND_API_KEY environment variable"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Supabase environment variables not set");
      return new Response(
        JSON.stringify({
          error: "El servicio de base de datos no está configurado",
          details: "Missing Supabase environment variables"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const payload: SendEmailPayload = await req.json();

    // Validate required fields
    if (
      !payload.recipientEmail ||
      !payload.subject ||
      !payload.bodyText ||
      !payload.pdfBase64 ||
      !payload.budgetNumber ||
      !payload.budgetId
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.recipientEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Prepare email log entry
    const emailLog: EmailLogInsert = {
      budgetId: payload.budgetId,
      recipientEmail: payload.recipientEmail,
      recipientName: payload.recipientName || null,
      subject: payload.subject,
      bodyText: payload.bodyText,
      status: "pending",
      errorMessage: null,
      sentAt: null,
    };

    // Convert base64 to buffer for attachment
    // Remove data URL prefix if present
    let base64Data = payload.pdfBase64;
    if (base64Data.includes(",")) {
      base64Data = base64Data.split(",")[1];
    }

    console.log("PDF base64 length:", base64Data.length);

    // Send email via Resend
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: emailFrom,
        to: [payload.recipientEmail],
        subject: payload.subject,
        text: payload.bodyText,
        attachments: [
          {
            filename: `Presupuesto_${payload.budgetNumber}.pdf`,
            content: base64Data,
          },
        ],
      });

      if (emailError) {
        console.error("Resend error:", emailError);

        // Enhanced error message for API key issues
        let errorMessage = emailError.message || "Unknown email error";
        if (emailError.message?.includes("API key") || emailError.message?.includes("401") || emailError.message?.includes("Unauthorized")) {
          errorMessage = "La API key de Resend no es válida. Por favor, verifica que RESEND_API_KEY esté configurado correctamente.";
        }

        emailLog.status = "failed";
        emailLog.errorMessage = errorMessage;
      } else {
        console.log("Email sent successfully:", emailData);
        emailLog.status = "sent";
        emailLog.sentAt = new Date().toISOString();
      }
    } catch (sendError) {
      console.error("Error sending email:", sendError);
      emailLog.status = "failed";
      emailLog.errorMessage =
        sendError instanceof Error ? sendError.message : "Failed to send email";
    }

    // Insert email log into database
    const { data: logData, error: logError } = await supabase
      .from("EmailLogs")
      .insert(emailLog)
      .select()
      .single();

    if (logError) {
      console.error("Error inserting email log:", logError);
      // Still return the result even if logging fails
      return new Response(
        JSON.stringify({
          success: emailLog.status === "sent",
          error:
            emailLog.status === "failed"
              ? emailLog.errorMessage
              : "Failed to log email",
          log: emailLog,
        }),
        {
          status: emailLog.status === "sent" ? 200 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success or failure response
    if (emailLog.status === "sent") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email sent successfully",
          log: logData,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: emailLog.errorMessage,
          log: logData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
