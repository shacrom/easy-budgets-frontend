-- =============================================================================
-- MIGRATION: Create EmailLogs table for email tracking
-- =============================================================================
-- This migration creates the EmailStatus enum and EmailLogs table to track
-- all emails sent from the application (budgets to customers, orders to suppliers)
-- =============================================================================

-- Create EmailStatus enum
CREATE TYPE "EmailStatus" AS ENUM ('pending', 'sent', 'failed');

-- Create EmailLogs table
CREATE TABLE "EmailLogs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "budgetId" bigint,
  "recipientEmail" character varying NOT NULL,
  "recipientName" character varying,
  "subject" character varying NOT NULL,
  "bodyText" text NOT NULL,
  "status" "EmailStatus" NOT NULL DEFAULT 'pending'::"EmailStatus",
  "errorMessage" text,
  "sentAt" timestamp with time zone,
  "createdAt" timestamp with time zone DEFAULT now(),
  CONSTRAINT "EmailLogs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailLogs_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budgets"("id") ON DELETE CASCADE
);

-- Create indexes for optimized queries
-- Index for fetching email history by budget, ordered by date
CREATE INDEX "EmailLogs_budgetId_createdAt_idx" ON "EmailLogs" ("budgetId", "createdAt" DESC);

-- Index for filtering by budget and status
CREATE INDEX "EmailLogs_budgetId_status_idx" ON "EmailLogs" ("budgetId", "status");

-- Index for searching by recipient email
CREATE INDEX "EmailLogs_recipientEmail_idx" ON "EmailLogs" ("recipientEmail");

-- Add trigger for future updatedAt column if needed
-- Currently not adding updatedAt as email logs are typically immutable after creation

COMMENT ON TABLE "EmailLogs" IS 'Tracks all emails sent from the application including budgets to customers';
COMMENT ON COLUMN "EmailLogs"."budgetId" IS 'Reference to the budget this email is related to (nullable for future non-budget emails)';
COMMENT ON COLUMN "EmailLogs"."status" IS 'Email delivery status: pending (queued), sent (delivered), failed (error)';
COMMENT ON COLUMN "EmailLogs"."errorMessage" IS 'Error details if status is failed';
COMMENT ON COLUMN "EmailLogs"."sentAt" IS 'Timestamp when the email was successfully sent';
