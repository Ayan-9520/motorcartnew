-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('customer', 'dealer', 'used_car_dealer', 'preowned_dealer', 'new_car_dealer', 'bike_dealer', 'truck_dealer', 'dsa_agent', 'bank_nbfc', 'finance_manager', 'service_center', 'service_partner', 'service_technician', 'parts_seller', 'admin', 'super_admin', 'auction_partner', 'employee', 'finance_partner', 'broker');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending_verification', 'closed');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('pending', 'submitted', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('draft', 'available', 'reserved', 'sold');

-- CreateEnum
CREATE TYPE "VehicleSaleMode" AS ENUM ('direct_owner', 'broker_assisted', 'dealer_offer', 'auction_sale');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('upcoming', 'live', 'ended', 'cancelled');

-- CreateEnum
CREATE TYPE "AuctionCategory" AS ENUM ('bank', 'insurance', 'fleet', 'dealer', 'government');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('draft', 'submitted', 'processing', 'approved', 'rejected', 'disbursed');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CommunityPersona" AS ENUM ('customer', 'dealer', 'broker', 'dsa', 'insurance_agent', 'workshop', 'parts_seller', 'influencer');

-- CreateEnum
CREATE TYPE "CommunityBusinessEntityType" AS ENUM ('dealer', 'broker', 'dsa', 'insurance_agent', 'workshop', 'parts_seller', 'influencer');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('member', 'moderator', 'admin', 'group_owner', 'group_moderator');

-- CreateEnum
CREATE TYPE "SocialPostKind" AS ENUM ('discussion', 'review', 'poll', 'embed');

-- CreateEnum
CREATE TYPE "SocialModerationStatus" AS ENUM ('pending', 'approved', 'rejected', 'hidden');

-- CreateEnum
CREATE TYPE "GrowthBusinessType" AS ENUM ('dealer', 'broker', 'dsa', 'insurance_agent', 'workshop', 'parts_seller', 'influencer');

-- CreateEnum
CREATE TYPE "GrowthWorkspaceStatus" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "GrowthAssetKind" AS ENUM ('image', 'video', 'logo', 'document');

-- CreateEnum
CREATE TYPE "GrowthDesignFormat" AS ENUM ('facebook_post', 'instagram_post', 'instagram_story', 'linkedin_post', 'banner', 'poster');

-- CreateEnum
CREATE TYPE "GrowthDesignStatus" AS ENUM ('draft', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "GrowthWhatsappTemplateStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "GrowthBroadcastStatus" AS ENUM ('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "GrowthDeliveryStatus" AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed', 'opted_out');

-- CreateEnum
CREATE TYPE "GrowthLeadCaptureStatus" AS ENUM ('new', 'qualified', 'spam', 'archived');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT,
    "role" "AppRole" NOT NULL DEFAULT 'customer',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'pending',
    "kyc_data" JSONB NOT NULL DEFAULT '{}',
    "company_name" TEXT,
    "city" TEXT,
    "state" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "onboarding_status" TEXT,
    "approval_status" TEXT,
    "profile_completion" INTEGER NOT NULL DEFAULT 0,
    "community_handle" VARCHAR(32),
    "community_bio" TEXT,
    "community_cover_url" VARCHAR(512),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "dealer_type" "AppRole" NOT NULL DEFAULT 'dealer',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "subscription_tier" TEXT NOT NULL DEFAULT 'basic',
    "total_listings_cap" INTEGER NOT NULL DEFAULT 25,
    "verification_status" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_calls" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "called_by" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "duration_seconds" INTEGER,
    "outcome" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_members" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'sales',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_storefronts" (
    "dealer_id" TEXT NOT NULL,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "cover_url" TEXT,
    "hero_tagline" TEXT,
    "showcase_tags" JSONB NOT NULL DEFAULT '[]',
    "show_finance_offers" BOOLEAN NOT NULL DEFAULT true,
    "show_reviews" BOOLEAN NOT NULL DEFAULT true,
    "show_inventory" BOOLEAN NOT NULL DEFAULT true,
    "contact_whatsapp" TEXT,
    "contact_phone" TEXT,
    "business_hours" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_storefronts_pkey" PRIMARY KEY ("dealer_id")
);

-- CreateTable
CREATE TABLE "dealer_documents" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_auction_entries" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "max_bid" BIGINT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_auction_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "assigned_to" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "task_type" TEXT NOT NULL DEFAULT 'callback',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_lead_notes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealer_lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brokers" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "license_number" VARCHAR(64),
    "city" VARCHAR(64) NOT NULL,
    "state" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(20),
    "whatsapp_number" VARCHAR(20),
    "email" VARCHAR(128),
    "commission_default_rate" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_buyers" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "full_name" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(128),
    "city" VARCHAR(64),
    "budget_min" BIGINT,
    "budget_max" BIGINT,
    "preferred_brands" JSONB NOT NULL DEFAULT '[]',
    "preferred_fuel" VARCHAR(32),
    "notes" TEXT,
    "status" VARCHAR(24) NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_sellers" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "full_name" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(128),
    "city" VARCHAR(64),
    "seller_type" VARCHAR(24) NOT NULL DEFAULT 'individual',
    "kyc_status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_leads" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "buyer_id" TEXT,
    "seller_id" TEXT,
    "name" VARCHAR(128) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(128),
    "source" VARCHAR(32) NOT NULL DEFAULT 'manual',
    "status" VARCHAR(24) NOT NULL DEFAULT 'new',
    "vehicle_interest" VARCHAR(255),
    "vehicle_id" TEXT,
    "vehicle_slug" VARCHAR(128),
    "sale_mode" VARCHAR(32),
    "assigned_to" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_deals" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "buyer_id" TEXT,
    "seller_id" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "stage" VARCHAR(32) NOT NULL DEFAULT 'inquiry',
    "deal_value" BIGINT,
    "token_amount" BIGINT,
    "expected_close_at" DATE,
    "closed_at" TIMESTAMP(3),
    "lost_reason" VARCHAR(255),
    "commission_rate" DECIMAL(5,2),
    "commission_amount" BIGINT,
    "assigned_to" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_deal_vehicles" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "vehicle_slug" VARCHAR(128),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "listing_title" VARCHAR(255),
    "listing_price" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_deal_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_deal_stage_history" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "from_stage" VARCHAR(32),
    "to_stage" VARCHAR(32) NOT NULL,
    "changed_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_deal_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_tasks" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "deal_id" TEXT,
    "assigned_to" TEXT,
    "task_type" VARCHAR(32) NOT NULL DEFAULT 'callback',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMP(3),
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(16) NOT NULL DEFAULT 'normal',
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_commissions" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "deal_value" BIGINT NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "commission_amount" BIGINT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "payout_reference" VARCHAR(64),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_lead_notes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_whatsapp_configs" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'manual',
    "business_phone" VARCHAR(20) NOT NULL,
    "webhook_secret" VARCHAR(128),
    "api_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_whatsapp_templates" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "template_key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "body" TEXT NOT NULL,
    "language" VARCHAR(8) NOT NULL DEFAULT 'en',
    "provider_template_id" VARCHAR(64),
    "status" VARCHAR(24) NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker_whatsapp_messages" (
    "id" TEXT NOT NULL,
    "broker_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "deal_id" TEXT,
    "direction" VARCHAR(8) NOT NULL,
    "provider_message_id" VARCHAR(128),
    "phone" VARCHAR(20) NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'queued',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broker_whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT,
    "seller_id" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "original_price" DECIMAL(12,2),
    "fuel_type" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "body_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kms_driven" INTEGER NOT NULL DEFAULT 0,
    "owners" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT,
    "location" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "features" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "is_certified" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "VehicleStatus" NOT NULL DEFAULT 'available',
    "condition" TEXT NOT NULL DEFAULT 'used',
    "sale_mode" "VehicleSaleMode" DEFAULT 'dealer_offer',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_specs" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "engine" TEXT,
    "power" TEXT,
    "torque" TEXT,
    "mileage" TEXT,
    "seating" INTEGER,
    "boot_space" TEXT,
    "safety" JSONB NOT NULL DEFAULT '[]',
    "extras" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "vehicle_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "vehicle_id" TEXT,
    "vehicle_interest" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "organizer_id" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "start_price" DECIMAL(12,2) NOT NULL,
    "current_bid" DECIMAL(12,2),
    "reserve_price" DECIMAL(12,2),
    "bid_increment" DECIMAL(12,2) NOT NULL DEFAULT 1000,
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "auction_category" "AuctionCategory" NOT NULL DEFAULT 'dealer',
    "status" "AuctionStatus" NOT NULL DEFAULT 'upcoming',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "winner_id" TEXT,
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "location" VARCHAR(128),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "images" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bidder_id" TEXT NOT NULL,
    "bidder_name" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_auto_bid" BOOLEAN NOT NULL DEFAULT false,
    "bid_source" VARCHAR(16),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_messages" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_auto_bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bidder_id" TEXT NOT NULL,
    "max_amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_auto_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_proxy_bids" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bidder_id" TEXT NOT NULL,
    "max_amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_proxy_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_watchlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bid_attempts" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bidder_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" VARCHAR(255),
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bid_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bidder_eligibility" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "auction_id" TEXT,
    "kyc_status" VARCHAR(24) NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "reason" VARCHAR(255),
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bidder_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "bank_type" TEXT NOT NULL DEFAULT 'nbfc',
    "interest_rate_min" DECIMAL(5,2) NOT NULL,
    "interest_rate_max" DECIMAL(5,2) NOT NULL,
    "max_tenure_months" INTEGER NOT NULL DEFAULT 84,
    "processing_fee" TEXT,
    "max_loan_amount" BIGINT NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bank_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "tenure" INTEGER NOT NULL,
    "status" "FinanceStatus" NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_applications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT,
    "premium" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_products" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category_slug" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "wholesale_price" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" JSONB NOT NULL DEFAULT '[]',
    "compatibility" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_orders" (
    "id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "part_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_centers" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "phone" TEXT,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "services_offered" JSONB NOT NULL DEFAULT '[]',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "images" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media" JSONB NOT NULL DEFAULT '[]',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "message" TEXT,
    "kind" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "user_agent" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "position" TEXT NOT NULL DEFAULT 'home',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploaded_files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT,
    "size" INTEGER,
    "public_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "price" BIGINT NOT NULL,
    "original_price" BIGINT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "images" JSONB NOT NULL DEFAULT '[]',
    "compatibility" JSONB NOT NULL DEFAULT '[]',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sku" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "description" TEXT,
    "price_from" BIGINT NOT NULL,
    "price_to" BIGINT,
    "duration_minutes" INTEGER,
    "is_doorstep" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "images" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "vehicle_details" JSONB NOT NULL DEFAULT '{}',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "total_amount" BIGINT,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "media" JSONB NOT NULL DEFAULT '[]',
    "post_type" "SocialPostKind" NOT NULL DEFAULT 'discussion',
    "vehicle_id" TEXT,
    "dealer_id" TEXT,
    "broker_id" TEXT,
    "group_id" TEXT,
    "embed_provider" VARCHAR(16),
    "embed_url" VARCHAR(512),
    "poll_options" JSONB,
    "poll_ends_at" TIMESTAMP(3),
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "spam_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "moderation_status" "SocialModerationStatus" NOT NULL DEFAULT 'approved',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "group_type" VARCHAR(24) NOT NULL DEFAULT 'open',
    "rule_key" VARCHAR(64),
    "rule_value" VARCHAR(128),
    "dealer_id" TEXT,
    "cover_url" VARCHAR(512),
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_hashtags" (
    "post_id" TEXT NOT NULL,
    "hashtag" TEXT NOT NULL,

    CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("post_id","hashtag")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_shares" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "option_index" INTEGER NOT NULL,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "community_moderation_flags" (
    "id" TEXT NOT NULL,
    "post_id" TEXT,
    "user_id" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_moderation_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "persona" "CommunityPersona" NOT NULL DEFAULT 'customer',
    "display_name" VARCHAR(128) NOT NULL,
    "handle" VARCHAR(32) NOT NULL,
    "avatar_url" TEXT,
    "cover_url" TEXT,
    "bio" TEXT,
    "location_city" VARCHAR(64),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "following_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_business_profiles" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "entity_type" "CommunityBusinessEntityType" NOT NULL,
    "entity_id" TEXT,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "tagline" VARCHAR(255),
    "logo_url" TEXT,
    "cover_url" TEXT,
    "website" VARCHAR(255),
    "phone" VARCHAR(20),
    "city" VARCHAR(64),
    "state" VARCHAR(64),
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_follows" (
    "id" TEXT NOT NULL,
    "follower_user_id" TEXT NOT NULL,
    "targetType" VARCHAR(16) NOT NULL,
    "target_user_id" TEXT,
    "target_business_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_role_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" VARCHAR(16) NOT NULL,
    "scope_id" TEXT,
    "role" "CommunityMemberRole" NOT NULL,
    "granted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_vehicles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER NOT NULL,
    "fuel_type" TEXT DEFAULT 'petrol',
    "transmission" TEXT DEFAULT 'manual',
    "registration_number" TEXT,
    "segment" TEXT NOT NULL DEFAULT 'car',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "health_score" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "doc_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT,
    "document_number" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_wallet" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "insurer_name" TEXT NOT NULL,
    "policy_number" TEXT,
    "policy_end" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "service_type" TEXT NOT NULL,
    "service_center" TEXT,
    "amount" BIGINT,
    "serviced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "user_id" TEXT NOT NULL,
    "notify_insurance" BOOLEAN NOT NULL DEFAULT true,
    "notify_service" BOOLEAN NOT NULL DEFAULT true,
    "profile_completion" INTEGER NOT NULL DEFAULT 0,
    "reward_points_balance" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "insight_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "dismissed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "dismissed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reminders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_quotes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "partner_id" TEXT,
    "premium" DECIMAL(12,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_leads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "dsa_id" TEXT,
    "amount" DECIMAL(12,2),
    "status" "FinanceStatus" NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_commissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_verifications" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_status_history" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_integration_configs" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dsa_agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "license_number" TEXT,
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dsa_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_car_inventory" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year" INTEGER NOT NULL DEFAULT 2025,
    "fuel_type" TEXT,
    "transmission" TEXT,
    "ex_showroom_price" DECIMAL(12,2) NOT NULL,
    "on_road_price" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock_status" TEXT NOT NULL DEFAULT 'available',
    "stock_health" TEXT DEFAULT 'fast_moving',
    "colors" JSONB NOT NULL DEFAULT '[]',
    "image_url" TEXT,
    "expected_delivery_days" INTEGER,
    "waiting_period_days" INTEGER,
    "brochure_url" VARCHAR(512),
    "offers" JSONB NOT NULL DEFAULT '[]',
    "last_stock_update_at" TIMESTAMP(3),
    "view360_url" VARCHAR(512),
    "price" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_car_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_car_stock_daily_logs" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "inventory_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "file_name" TEXT,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_car_stock_daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_compatibility_rules" (
    "id" TEXT NOT NULL,
    "part_id" TEXT,
    "part_product_id" TEXT,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "fuel_type" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_compatibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_registration_lookups" (
    "id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "fuel_type" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_registration_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealer_leads" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "stage" TEXT NOT NULL DEFAULT 'new',
    "preferred_brand" TEXT,
    "preferred_model" TEXT,
    "budget_max" DECIMAL(12,2),
    "trade_in_vehicle" TEXT,
    "finance_interest" BOOLEAN NOT NULL DEFAULT false,
    "insurance_interest" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "status" TEXT DEFAULT 'new',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealer_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_uploads" (
    "id" TEXT NOT NULL,
    "dealer_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_log" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "inventory_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_job_cards" (
    "id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_job_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_customers_crm" (
    "id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_customers_crm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ai_logs" (
    "id" TEXT NOT NULL,
    "service_center_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_ai_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_cms_pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fraud_alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_fraud_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_report_snapshots" (
    "id" TEXT NOT NULL,
    "report_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts_supplier_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_supplier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_notifications" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_workspaces" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "business_type" "GrowthBusinessType" NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "entity_id" TEXT,
    "subscription_plan_slug" VARCHAR(64),
    "subscription_tier" VARCHAR(32) NOT NULL DEFAULT 'free',
    "status" "GrowthWorkspaceStatus" NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_workspace_entitlements" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "plan_slug" VARCHAR(64) NOT NULL DEFAULT 'free',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "usage" JSONB NOT NULL DEFAULT '{}',
    "refreshed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_ends_at" TIMESTAMP(3),

    CONSTRAINT "growth_workspace_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_assets" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "kind" "GrowthAssetKind" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "storage_path" VARCHAR(512) NOT NULL,
    "public_url" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(128),
    "size_bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_designs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "format" "GrowthDesignFormat" NOT NULL,
    "status" "GrowthDesignStatus" NOT NULL DEFAULT 'draft',
    "canvas_json" JSONB NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1080,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_design_exports" (
    "id" TEXT NOT NULL,
    "design_id" TEXT NOT NULL,
    "format" VARCHAR(8) NOT NULL DEFAULT 'png',
    "public_url" VARCHAR(512) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_design_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_whatsapp_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "template_key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "category" VARCHAR(32) NOT NULL DEFAULT 'marketing',
    "body" TEXT NOT NULL,
    "language" VARCHAR(8) NOT NULL DEFAULT 'en',
    "variables_schema" JSONB NOT NULL DEFAULT '[]',
    "provider_template_id" VARCHAR(64),
    "status" "GrowthWhatsappTemplateStatus" NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_contact_lists" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_contact_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_contact_list_members" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(128),
    "opt_in_at" TIMESTAMP(3),
    "opt_out_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_contact_list_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_whatsapp_broadcasts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "status" "GrowthBroadcastStatus" NOT NULL DEFAULT 'draft',
    "schedule_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_whatsapp_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_whatsapp_broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "status" "GrowthDeliveryStatus" NOT NULL DEFAULT 'queued',
    "last_event_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_whatsapp_broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_message_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "broadcast_id" TEXT,
    "channel" VARCHAR(16) NOT NULL DEFAULT 'whatsapp',
    "direction" VARCHAR(8) NOT NULL,
    "phone" VARCHAR(20),
    "body" TEXT NOT NULL,
    "status" "GrowthDeliveryStatus" NOT NULL DEFAULT 'queued',
    "provider_id" VARCHAR(128),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_lead_capture_forms" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "fields_schema" JSONB NOT NULL DEFAULT '[]',
    "thank_you_url" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_lead_capture_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_lead_capture_events" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "status" "GrowthLeadCaptureStatus" NOT NULL DEFAULT 'new',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_lead_capture_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_community_handle_key" ON "users"("community_handle");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "otp_codes_phone_idx" ON "otp_codes"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_email_idx" ON "password_resets"("email");

-- CreateIndex
CREATE UNIQUE INDEX "dealers_slug_key" ON "dealers"("slug");

-- CreateIndex
CREATE INDEX "dealers_owner_id_idx" ON "dealers"("owner_id");

-- CreateIndex
CREATE INDEX "dealers_city_idx" ON "dealers"("city");

-- CreateIndex
CREATE INDEX "lead_calls_lead_id_idx" ON "lead_calls"("lead_id");

-- CreateIndex
CREATE INDEX "lead_calls_dealer_id_idx" ON "lead_calls"("dealer_id");

-- CreateIndex
CREATE INDEX "dealer_members_dealer_id_idx" ON "dealer_members"("dealer_id");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_members_dealer_id_email_key" ON "dealer_members"("dealer_id", "email");

-- CreateIndex
CREATE INDEX "dealer_documents_dealer_id_idx" ON "dealer_documents"("dealer_id");

-- CreateIndex
CREATE INDEX "dealer_auction_entries_dealer_id_idx" ON "dealer_auction_entries"("dealer_id");

-- CreateIndex
CREATE UNIQUE INDEX "dealer_auction_entries_dealer_id_auction_id_key" ON "dealer_auction_entries"("dealer_id", "auction_id");

-- CreateIndex
CREATE INDEX "crm_tasks_dealer_id_idx" ON "crm_tasks"("dealer_id");

-- CreateIndex
CREATE INDEX "dealer_lead_notes_lead_id_idx" ON "dealer_lead_notes"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_slug_key" ON "brokers"("slug");

-- CreateIndex
CREATE INDEX "brokers_owner_id_idx" ON "brokers"("owner_id");

-- CreateIndex
CREATE INDEX "broker_buyers_broker_id_phone_idx" ON "broker_buyers"("broker_id", "phone");

-- CreateIndex
CREATE INDEX "broker_buyers_broker_id_status_idx" ON "broker_buyers"("broker_id", "status");

-- CreateIndex
CREATE INDEX "broker_sellers_broker_id_phone_idx" ON "broker_sellers"("broker_id", "phone");

-- CreateIndex
CREATE INDEX "broker_leads_broker_id_status_idx" ON "broker_leads"("broker_id", "status");

-- CreateIndex
CREATE INDEX "broker_leads_broker_id_created_at_idx" ON "broker_leads"("broker_id", "created_at");

-- CreateIndex
CREATE INDEX "broker_deals_broker_id_stage_idx" ON "broker_deals"("broker_id", "stage");

-- CreateIndex
CREATE INDEX "broker_deals_broker_id_closed_at_idx" ON "broker_deals"("broker_id", "closed_at");

-- CreateIndex
CREATE INDEX "broker_deal_vehicles_deal_id_idx" ON "broker_deal_vehicles"("deal_id");

-- CreateIndex
CREATE INDEX "broker_deal_vehicles_vehicle_id_idx" ON "broker_deal_vehicles"("vehicle_id");

-- CreateIndex
CREATE INDEX "broker_deal_stage_history_deal_id_idx" ON "broker_deal_stage_history"("deal_id");

-- CreateIndex
CREATE INDEX "broker_tasks_broker_id_due_at_idx" ON "broker_tasks"("broker_id", "due_at");

-- CreateIndex
CREATE INDEX "broker_tasks_broker_id_status_idx" ON "broker_tasks"("broker_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "broker_commissions_deal_id_key" ON "broker_commissions"("deal_id");

-- CreateIndex
CREATE INDEX "broker_commissions_broker_id_status_idx" ON "broker_commissions"("broker_id", "status");

-- CreateIndex
CREATE INDEX "broker_lead_notes_lead_id_idx" ON "broker_lead_notes"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "broker_whatsapp_configs_broker_id_key" ON "broker_whatsapp_configs"("broker_id");

-- CreateIndex
CREATE INDEX "broker_whatsapp_templates_broker_id_idx" ON "broker_whatsapp_templates"("broker_id");

-- CreateIndex
CREATE UNIQUE INDEX "broker_whatsapp_messages_provider_message_id_key" ON "broker_whatsapp_messages"("provider_message_id");

-- CreateIndex
CREATE INDEX "broker_whatsapp_messages_broker_id_created_at_idx" ON "broker_whatsapp_messages"("broker_id", "created_at");

-- CreateIndex
CREATE INDEX "broker_whatsapp_messages_lead_id_idx" ON "broker_whatsapp_messages"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_slug_key" ON "vehicles"("slug");

-- CreateIndex
CREATE INDEX "vehicles_dealer_id_idx" ON "vehicles"("dealer_id");

-- CreateIndex
CREATE INDEX "vehicles_category_idx" ON "vehicles"("category");

-- CreateIndex
CREATE INDEX "vehicles_brand_model_idx" ON "vehicles"("brand", "model");

-- CreateIndex
CREATE INDEX "vehicles_city_idx" ON "vehicles"("city");

-- CreateIndex
CREATE INDEX "vehicles_sale_mode_idx" ON "vehicles"("sale_mode");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_specs_vehicle_id_key" ON "vehicle_specs"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_vehicle_id_key" ON "wishlists"("user_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "leads_dealer_id_status_idx" ON "leads"("dealer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_slug_key" ON "auctions"("slug");

-- CreateIndex
CREATE INDEX "auctions_status_idx" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "auctions_auction_category_status_idx" ON "auctions"("auction_category", "status");

-- CreateIndex
CREATE INDEX "auctions_organizer_id_idx" ON "auctions"("organizer_id");

-- CreateIndex
CREATE INDEX "bids_auction_id_idx" ON "bids"("auction_id");

-- CreateIndex
CREATE INDEX "auction_messages_auction_id_idx" ON "auction_messages"("auction_id");

-- CreateIndex
CREATE INDEX "auction_auto_bids_auction_id_idx" ON "auction_auto_bids"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "auction_auto_bids_auction_id_bidder_id_key" ON "auction_auto_bids"("auction_id", "bidder_id");

-- CreateIndex
CREATE INDEX "auction_proxy_bids_auction_id_idx" ON "auction_proxy_bids"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "auction_proxy_bids_auction_id_bidder_id_key" ON "auction_proxy_bids"("auction_id", "bidder_id");

-- CreateIndex
CREATE INDEX "auction_watchlists_user_id_idx" ON "auction_watchlists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auction_watchlists_user_id_auction_id_key" ON "auction_watchlists"("user_id", "auction_id");

-- CreateIndex
CREATE INDEX "auction_bid_attempts_auction_id_bidder_id_created_at_idx" ON "auction_bid_attempts"("auction_id", "bidder_id", "created_at");

-- CreateIndex
CREATE INDEX "auction_bidder_eligibility_user_id_checked_at_idx" ON "auction_bidder_eligibility"("user_id", "checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "banks_slug_key" ON "banks"("slug");

-- CreateIndex
CREATE INDEX "finance_applications_user_id_idx" ON "finance_applications"("user_id");

-- CreateIndex
CREATE INDEX "insurance_applications_user_id_idx" ON "insurance_applications"("user_id");

-- CreateIndex
CREATE INDEX "part_products_seller_id_idx" ON "part_products"("seller_id");

-- CreateIndex
CREATE INDEX "part_products_category_slug_idx" ON "part_products"("category_slug");

-- CreateIndex
CREATE INDEX "part_orders_buyer_id_idx" ON "part_orders"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_centers_slug_key" ON "service_centers"("slug");

-- CreateIndex
CREATE INDEX "service_centers_owner_id_idx" ON "service_centers"("owner_id");

-- CreateIndex
CREATE INDEX "service_bookings_user_id_idx" ON "service_bookings"("user_id");

-- CreateIndex
CREATE INDEX "service_bookings_service_center_id_idx" ON "service_bookings"("service_center_id");

-- CreateIndex
CREATE INDEX "community_posts_author_id_idx" ON "community_posts"("author_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_user_id_device_id_key" ON "device_sessions"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "uploaded_files_bucket_path_idx" ON "uploaded_files"("bucket", "path");

-- CreateIndex
CREATE UNIQUE INDEX "parts_slug_key" ON "parts"("slug");

-- CreateIndex
CREATE INDEX "parts_seller_id_idx" ON "parts"("seller_id");

-- CreateIndex
CREATE INDEX "parts_category_idx" ON "parts"("category");

-- CreateIndex
CREATE INDEX "services_service_center_id_idx" ON "services"("service_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_service_center_id_slug_key" ON "services"("service_center_id", "slug");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_service_center_id_idx" ON "bookings"("service_center_id");

-- CreateIndex
CREATE INDEX "reviews_entity_type_entity_id_idx" ON "reviews"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "social_posts_author_id_idx" ON "social_posts"("author_id");

-- CreateIndex
CREATE INDEX "social_posts_author_id_created_at_idx" ON "social_posts"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "social_posts_group_id_created_at_idx" ON "social_posts"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "social_posts_moderation_status_created_at_idx" ON "social_posts"("moderation_status", "created_at");

-- CreateIndex
CREATE INDEX "social_posts_created_at_idx" ON "social_posts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_groups_slug_key" ON "community_groups"("slug");

-- CreateIndex
CREATE INDEX "community_groups_group_type_idx" ON "community_groups"("group_type");

-- CreateIndex
CREATE INDEX "post_hashtags_hashtag_idx" ON "post_hashtags"("hashtag");

-- CreateIndex
CREATE INDEX "post_comments_post_id_idx" ON "post_comments"("post_id");

-- CreateIndex
CREATE INDEX "post_shares_post_id_idx" ON "post_shares"("post_id");

-- CreateIndex
CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_user_profiles_user_id_key" ON "community_user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_user_profiles_handle_key" ON "community_user_profiles"("handle");

-- CreateIndex
CREATE INDEX "community_user_profiles_persona_idx" ON "community_user_profiles"("persona");

-- CreateIndex
CREATE UNIQUE INDEX "community_business_profiles_slug_key" ON "community_business_profiles"("slug");

-- CreateIndex
CREATE INDEX "community_business_profiles_entity_type_entity_id_idx" ON "community_business_profiles"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "community_business_profiles_owner_user_id_idx" ON "community_business_profiles"("owner_user_id");

-- CreateIndex
CREATE INDEX "community_follows_follower_user_id_idx" ON "community_follows"("follower_user_id");

-- CreateIndex
CREATE INDEX "community_follows_target_user_id_idx" ON "community_follows"("target_user_id");

-- CreateIndex
CREATE INDEX "community_follows_target_business_id_idx" ON "community_follows"("target_business_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_follows_follower_user_id_targetType_target_user_i_key" ON "community_follows"("follower_user_id", "targetType", "target_user_id", "target_business_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_group_members_group_id_user_id_key" ON "community_group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "community_role_assignments_user_id_idx" ON "community_role_assignments"("user_id");

-- CreateIndex
CREATE INDEX "community_role_assignments_scope_scope_id_idx" ON "community_role_assignments"("scope", "scope_id");

-- CreateIndex
CREATE INDEX "customer_vehicles_user_id_idx" ON "customer_vehicles"("user_id");

-- CreateIndex
CREATE INDEX "vehicle_documents_user_id_idx" ON "vehicle_documents"("user_id");

-- CreateIndex
CREATE INDEX "insurance_wallet_user_id_idx" ON "insurance_wallet"("user_id");

-- CreateIndex
CREATE INDEX "service_records_user_id_idx" ON "service_records"("user_id");

-- CreateIndex
CREATE INDEX "ai_insights_user_id_idx" ON "ai_insights"("user_id");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_idx" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "engagement_campaigns_user_id_idx" ON "engagement_campaigns"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_reminders_user_id_idx" ON "scheduled_reminders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_partners_slug_key" ON "insurance_partners"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "dsa_agents_user_id_key" ON "dsa_agents"("user_id");

-- CreateIndex
CREATE INDEX "new_car_inventory_dealer_id_idx" ON "new_car_inventory"("dealer_id");

-- CreateIndex
CREATE INDEX "new_car_stock_daily_logs_dealer_id_created_at_idx" ON "new_car_stock_daily_logs"("dealer_id", "created_at");

-- CreateIndex
CREATE INDEX "new_car_stock_daily_logs_inventory_id_idx" ON "new_car_stock_daily_logs"("inventory_id");

-- CreateIndex
CREATE INDEX "part_compatibility_rules_brand_model_idx" ON "part_compatibility_rules"("brand", "model");

-- CreateIndex
CREATE INDEX "part_compatibility_rules_part_id_idx" ON "part_compatibility_rules"("part_id");

-- CreateIndex
CREATE INDEX "part_compatibility_rules_part_product_id_idx" ON "part_compatibility_rules"("part_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "part_registration_lookups_registration_number_key" ON "part_registration_lookups"("registration_number");

-- CreateIndex
CREATE INDEX "dealer_leads_dealer_id_idx" ON "dealer_leads"("dealer_id");

-- CreateIndex
CREATE INDEX "inventory_uploads_dealer_id_idx" ON "inventory_uploads"("dealer_id");

-- CreateIndex
CREATE INDEX "service_job_cards_service_center_id_idx" ON "service_job_cards"("service_center_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_cms_pages_slug_key" ON "platform_cms_pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "parts_supplier_profiles_user_id_key" ON "parts_supplier_profiles"("user_id");

-- CreateIndex
CREATE INDEX "auction_notifications_auction_id_idx" ON "auction_notifications"("auction_id");

-- CreateIndex
CREATE UNIQUE INDEX "growth_workspaces_slug_key" ON "growth_workspaces"("slug");

-- CreateIndex
CREATE INDEX "growth_workspaces_owner_user_id_idx" ON "growth_workspaces"("owner_user_id");

-- CreateIndex
CREATE INDEX "growth_workspaces_business_type_idx" ON "growth_workspaces"("business_type");

-- CreateIndex
CREATE INDEX "growth_workspaces_entity_id_idx" ON "growth_workspaces"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "growth_workspace_entitlements_workspace_id_key" ON "growth_workspace_entitlements"("workspace_id");

-- CreateIndex
CREATE INDEX "growth_assets_workspace_id_kind_idx" ON "growth_assets"("workspace_id", "kind");

-- CreateIndex
CREATE INDEX "growth_assets_workspace_id_created_at_idx" ON "growth_assets"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "growth_designs_workspace_id_status_idx" ON "growth_designs"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "growth_designs_workspace_id_format_idx" ON "growth_designs"("workspace_id", "format");

-- CreateIndex
CREATE INDEX "growth_design_exports_design_id_created_at_idx" ON "growth_design_exports"("design_id", "created_at");

-- CreateIndex
CREATE INDEX "growth_whatsapp_templates_workspace_id_status_idx" ON "growth_whatsapp_templates"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "growth_whatsapp_templates_workspace_id_template_key_key" ON "growth_whatsapp_templates"("workspace_id", "template_key");

-- CreateIndex
CREATE INDEX "growth_contact_lists_workspace_id_idx" ON "growth_contact_lists"("workspace_id");

-- CreateIndex
CREATE INDEX "growth_contact_list_members_phone_idx" ON "growth_contact_list_members"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "growth_contact_list_members_list_id_phone_key" ON "growth_contact_list_members"("list_id", "phone");

-- CreateIndex
CREATE INDEX "growth_whatsapp_broadcasts_workspace_id_status_idx" ON "growth_whatsapp_broadcasts"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "growth_whatsapp_broadcasts_workspace_id_created_at_idx" ON "growth_whatsapp_broadcasts"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "growth_whatsapp_broadcasts_schedule_at_idx" ON "growth_whatsapp_broadcasts"("schedule_at");

-- CreateIndex
CREATE INDEX "growth_whatsapp_broadcast_recipients_broadcast_id_status_idx" ON "growth_whatsapp_broadcast_recipients"("broadcast_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "growth_whatsapp_broadcast_recipients_broadcast_id_phone_key" ON "growth_whatsapp_broadcast_recipients"("broadcast_id", "phone");

-- CreateIndex
CREATE INDEX "growth_message_logs_workspace_id_created_at_idx" ON "growth_message_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "growth_message_logs_broadcast_id_idx" ON "growth_message_logs"("broadcast_id");

-- CreateIndex
CREATE UNIQUE INDEX "growth_lead_capture_forms_workspace_id_slug_key" ON "growth_lead_capture_forms"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "growth_lead_capture_events_form_id_created_at_idx" ON "growth_lead_capture_events"("form_id", "created_at");

-- CreateIndex
CREATE INDEX "growth_lead_capture_events_status_idx" ON "growth_lead_capture_events"("status");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_calls" ADD CONSTRAINT "lead_calls_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_members" ADD CONSTRAINT "dealer_members_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_storefronts" ADD CONSTRAINT "dealer_storefronts_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_documents" ADD CONSTRAINT "dealer_documents_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dealer_auction_entries" ADD CONSTRAINT "dealer_auction_entries_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_buyers" ADD CONSTRAINT "broker_buyers_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_sellers" ADD CONSTRAINT "broker_sellers_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_leads" ADD CONSTRAINT "broker_leads_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_leads" ADD CONSTRAINT "broker_leads_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "broker_buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_leads" ADD CONSTRAINT "broker_leads_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "broker_sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_deals" ADD CONSTRAINT "broker_deals_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_deals" ADD CONSTRAINT "broker_deals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "broker_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_deals" ADD CONSTRAINT "broker_deals_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "broker_buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_deals" ADD CONSTRAINT "broker_deals_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "broker_sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_deal_vehicles" ADD CONSTRAINT "broker_deal_vehicles_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "broker_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_deal_stage_history" ADD CONSTRAINT "broker_deal_stage_history_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "broker_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_tasks" ADD CONSTRAINT "broker_tasks_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_tasks" ADD CONSTRAINT "broker_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "broker_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_tasks" ADD CONSTRAINT "broker_tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "broker_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_commissions" ADD CONSTRAINT "broker_commissions_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_commissions" ADD CONSTRAINT "broker_commissions_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "broker_deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_lead_notes" ADD CONSTRAINT "broker_lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "broker_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_lead_notes" ADD CONSTRAINT "broker_lead_notes_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_whatsapp_configs" ADD CONSTRAINT "broker_whatsapp_configs_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_whatsapp_templates" ADD CONSTRAINT "broker_whatsapp_templates_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_whatsapp_messages" ADD CONSTRAINT "broker_whatsapp_messages_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_whatsapp_messages" ADD CONSTRAINT "broker_whatsapp_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "broker_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_whatsapp_messages" ADD CONSTRAINT "broker_whatsapp_messages_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "broker_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_specs" ADD CONSTRAINT "vehicle_specs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_messages" ADD CONSTRAINT "auction_messages_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_auto_bids" ADD CONSTRAINT "auction_auto_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_proxy_bids" ADD CONSTRAINT "auction_proxy_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_watchlists" ADD CONSTRAINT "auction_watchlists_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_applications" ADD CONSTRAINT "finance_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_applications" ADD CONSTRAINT "insurance_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_order_items" ADD CONSTRAINT "part_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "part_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_order_items" ADD CONSTRAINT "part_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_center_id_fkey" FOREIGN KEY ("service_center_id") REFERENCES "service_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_service_center_id_fkey" FOREIGN KEY ("service_center_id") REFERENCES "service_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_center_id_fkey" FOREIGN KEY ("service_center_id") REFERENCES "service_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_user_profiles" ADD CONSTRAINT "community_user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_business_profiles" ADD CONSTRAINT "community_business_profiles_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_follower_user_id_fkey" FOREIGN KEY ("follower_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_target_business_id_fkey" FOREIGN KEY ("target_business_id") REFERENCES "community_business_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_members" ADD CONSTRAINT "community_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "community_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_group_members" ADD CONSTRAINT "community_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_role_assignments" ADD CONSTRAINT "community_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_vehicles" ADD CONSTRAINT "customer_vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibility_rules" ADD CONSTRAINT "part_compatibility_rules_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibility_rules" ADD CONSTRAINT "part_compatibility_rules_part_product_id_fkey" FOREIGN KEY ("part_product_id") REFERENCES "part_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_workspaces" ADD CONSTRAINT "growth_workspaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_workspace_entitlements" ADD CONSTRAINT "growth_workspace_entitlements_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_assets" ADD CONSTRAINT "growth_assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_designs" ADD CONSTRAINT "growth_designs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_design_exports" ADD CONSTRAINT "growth_design_exports_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "growth_designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_whatsapp_templates" ADD CONSTRAINT "growth_whatsapp_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contact_lists" ADD CONSTRAINT "growth_contact_lists_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contact_list_members" ADD CONSTRAINT "growth_contact_list_members_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "growth_contact_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_whatsapp_broadcasts" ADD CONSTRAINT "growth_whatsapp_broadcasts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_whatsapp_broadcasts" ADD CONSTRAINT "growth_whatsapp_broadcasts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "growth_whatsapp_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_whatsapp_broadcasts" ADD CONSTRAINT "growth_whatsapp_broadcasts_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "growth_contact_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_whatsapp_broadcast_recipients" ADD CONSTRAINT "growth_whatsapp_broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "growth_whatsapp_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_message_logs" ADD CONSTRAINT "growth_message_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_message_logs" ADD CONSTRAINT "growth_message_logs_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "growth_whatsapp_broadcasts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_lead_capture_forms" ADD CONSTRAINT "growth_lead_capture_forms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "growth_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_lead_capture_events" ADD CONSTRAINT "growth_lead_capture_events_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "growth_lead_capture_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

