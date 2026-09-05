-- Batch 10 Communication OS + telephony + AI sales. Additive only.

CREATE TABLE "communication_providers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" VARCHAR(80) NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "environment" VARCHAR(16) NOT NULL DEFAULT 'sandbox',
    "status" VARCHAR(16) NOT NULL DEFAULT 'DISABLED',
    "sender_id" VARCHAR(80),
    "credentials_ref" VARCHAR(120),
    "secret_hash" TEXT,
    "webhook_secret_hash" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "communication_providers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "communication_providers_organization_id_channel_idx" ON "communication_providers"("organization_id", "channel");
CREATE INDEX "communication_providers_channel_status_idx" ON "communication_providers"("channel", "status");
ALTER TABLE "communication_providers" ADD CONSTRAINT "communication_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "communication_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "timezone" VARCHAR(40) NOT NULL DEFAULT 'Asia/Kolkata',
    "quiet_start_hour" INTEGER NOT NULL DEFAULT 21,
    "quiet_end_hour" INTEGER NOT NULL DEFAULT 8,
    "max_outbound_per_day" INTEGER NOT NULL DEFAULT 8,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 120,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "communication_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "communication_policies_organization_id_key" ON "communication_policies"("organization_id");
ALTER TABLE "communication_policies" ADD CONSTRAINT "communication_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "communication_threads" (
    "id" TEXT NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "lead_id" TEXT,
    "opportunity_id" TEXT,
    "customer_user_id" TEXT,
    "dealer_id" TEXT,
    "organization_id" TEXT,
    "subject" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "communication_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "communication_threads_lead_id_idx" ON "communication_threads"("lead_id");
CREATE INDEX "communication_threads_dealer_id_created_at_idx" ON "communication_threads"("dealer_id", "created_at");
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "communication_messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "direction" VARCHAR(16) NOT NULL,
    "customer_user_id" TEXT,
    "lead_id" TEXT,
    "opportunity_id" TEXT,
    "dealer_id" TEXT,
    "organization_id" TEXT,
    "actor_user_id" TEXT,
    "provider_id" TEXT,
    "provider_message_id" TEXT,
    "recipient_masked" VARCHAR(40),
    "template_id" VARCHAR(80),
    "template_approved" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "status" VARCHAR(16) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" VARCHAR(160),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "communication_messages_thread_id_created_at_idx" ON "communication_messages"("thread_id", "created_at");
CREATE INDEX "communication_messages_lead_id_created_at_idx" ON "communication_messages"("lead_id", "created_at");
CREATE INDEX "communication_messages_provider_message_id_idx" ON "communication_messages"("provider_message_id");
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "communication_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "communication_webhook_events" (
    "id" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "communication_webhook_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "communication_webhook_events_provider_event_id_key" ON "communication_webhook_events"("provider_event_id");

CREATE TABLE "call_sessions" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT,
    "opportunity_id" TEXT,
    "customer_user_id" TEXT,
    "dealer_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "agent_user_id" TEXT NOT NULL,
    "thread_id" TEXT,
    "lead_call_id" TEXT,
    "provider_id" TEXT,
    "provider_call_id" TEXT,
    "direction" VARCHAR(16) NOT NULL DEFAULT 'outbound',
    "status" VARCHAR(16) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "disposition" VARCHAR(32),
    "notes" TEXT,
    "recording_status" VARCHAR(24) NOT NULL DEFAULT 'NOT_REQUESTED',
    "consent_status" VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
    "ai_calling" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "call_sessions_dealer_id_created_at_idx" ON "call_sessions"("dealer_id", "created_at");
CREATE INDEX "call_sessions_lead_id_idx" ON "call_sessions"("lead_id");
CREATE INDEX "call_sessions_provider_call_id_idx" ON "call_sessions"("provider_call_id");
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_agent_user_id_fkey" FOREIGN KEY ("agent_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "communication_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "call_recordings" (
    "id" TEXT NOT NULL,
    "call_session_id" TEXT NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "duration_seconds" INTEGER,
    "access_policy" VARCHAR(32) NOT NULL DEFAULT 'ORG_RESTRICTED',
    "retention_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "call_recordings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "call_recordings_call_session_id_key" ON "call_recordings"("call_session_id");
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "call_transcripts" (
    "id" TEXT NOT NULL,
    "call_session_id" TEXT NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "text" TEXT NOT NULL,
    "source" VARCHAR(16) NOT NULL DEFAULT 'PROVIDER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "call_transcripts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "call_transcripts_call_session_id_key" ON "call_transcripts"("call_session_id");
ALTER TABLE "call_transcripts" ADD CONSTRAINT "call_transcripts_call_session_id_fkey" FOREIGN KEY ("call_session_id") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_call_summaries" (
    "id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "labeled_ai" BOOLEAN NOT NULL DEFAULT true,
    "customer_intent" TEXT,
    "requirement" TEXT,
    "budget_mention" TEXT,
    "timeline" TEXT,
    "follow_up" TEXT,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "objections" JSONB NOT NULL DEFAULT '[]',
    "sentiment" VARCHAR(24),
    "next_action" TEXT,
    "raw_output" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_call_summaries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_call_summaries_transcript_id_idx" ON "ai_call_summaries"("transcript_id");
ALTER TABLE "ai_call_summaries" ADD CONSTRAINT "ai_call_summaries_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "call_transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_agent_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "agent_type" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "language" VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    "system_prompt" TEXT NOT NULL,
    "tools" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_agent_configs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_agent_configs_agent_type_active_idx" ON "ai_agent_configs"("agent_type", "active");
ALTER TABLE "ai_agent_configs" ADD CONSTRAINT "ai_agent_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT NOT NULL,
    "agent_type" VARCHAR(40) NOT NULL,
    "agent_config_id" TEXT,
    "lead_id" TEXT,
    "language" VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "handed_off_at" TIMESTAMP(3),
    "handed_off_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_conversations_user_id_created_at_idx" ON "ai_conversations"("user_id", "created_at");
CREATE INDEX "ai_conversations_organization_id_idx" ON "ai_conversations"("organization_id");
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_agent_config_id_fkey" FOREIGN KEY ("agent_config_id") REFERENCES "ai_agent_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "language" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "labeled_ai" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_tool_executions" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "tool_name" VARCHAR(64) NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_tool_executions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_tool_executions_conversation_id_idx" ON "ai_tool_executions"("conversation_id");
ALTER TABLE "ai_tool_executions" ADD CONSTRAINT "ai_tool_executions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_usage_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "agent_type" VARCHAR(40) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "model" VARCHAR(64),
    "units" INTEGER,
    "status" VARCHAR(16) NOT NULL,
    "cost_metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_usage_records_organization_id_created_at_idx" ON "ai_usage_records"("organization_id", "created_at");
CREATE INDEX "ai_usage_records_user_id_created_at_idx" ON "ai_usage_records"("user_id", "created_at");
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
