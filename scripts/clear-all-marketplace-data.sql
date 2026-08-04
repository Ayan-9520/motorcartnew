-- Wipe all public marketplace / listing data. Keeps user accounts (login).
-- Run: Get-Content scripts/clear-all-marketplace-data.sql | docker exec -i motorcart-postgres-1 psql -U motorcart -d motorcart

BEGIN;

-- Auctions
DELETE FROM auction_bid_attempts;
DELETE FROM auction_bidder_eligibility;
DELETE FROM auction_auto_bids;
DELETE FROM auction_proxy_bids;
DELETE FROM auction_watchlists;
DELETE FROM auction_messages;
DELETE FROM auction_notifications;
DELETE FROM bids;
DELETE FROM auctions;

-- Leads & CRM
DELETE FROM lead_calls;
DELETE FROM dealer_lead_notes;
DELETE FROM dealer_leads;
DELETE FROM crm_tasks;
DELETE FROM leads;

-- Broker desk
DELETE FROM broker_whatsapp_messages;
DELETE FROM broker_whatsapp_templates;
DELETE FROM broker_whatsapp_configs;
DELETE FROM broker_commissions;
DELETE FROM broker_tasks;
DELETE FROM broker_lead_notes;
DELETE FROM broker_deal_stage_history;
DELETE FROM broker_deal_vehicles;
DELETE FROM broker_deals;
DELETE FROM broker_leads;
DELETE FROM broker_buyers;
DELETE FROM broker_sellers;
DELETE FROM brokers;

-- Parts & orders
DELETE FROM part_order_items;
DELETE FROM part_orders;
DELETE FROM part_compatibility_rules;
DELETE FROM part_registration_lookups;
DELETE FROM parts;
DELETE FROM part_products;
DELETE FROM parts_supplier_profiles;

-- Services
DELETE FROM service_ai_logs;
DELETE FROM service_job_cards;
DELETE FROM service_customers_crm;
DELETE FROM service_records;
DELETE FROM service_bookings;
DELETE FROM bookings;
DELETE FROM services;
DELETE FROM service_centers;

-- Vehicles & inventory
DELETE FROM wishlists;
DELETE FROM vehicle_documents;
DELETE FROM vehicle_specs;
DELETE FROM new_car_stock_daily_logs;
DELETE FROM new_car_inventory;
DELETE FROM inventory_uploads;
DELETE FROM customer_vehicles;
DELETE FROM vehicles;

-- Finance / insurance applications (marketplace enquiries)
DELETE FROM finance_status_history;
DELETE FROM finance_verifications;
DELETE FROM finance_commissions;
DELETE FROM finance_applications;
DELETE FROM finance_leads;
DELETE FROM insurance_applications;
DELETE FROM insurance_quotes;
DELETE FROM insurance_wallet;

-- Community & social
DELETE FROM community_moderation_flags;
DELETE FROM poll_votes;
DELETE FROM post_comments;
DELETE FROM post_likes;
DELETE FROM post_shares;
DELETE FROM post_hashtags;
DELETE FROM social_posts;
DELETE FROM community_posts;
DELETE FROM community_follows;
DELETE FROM community_group_members;
DELETE FROM user_follows;
DELETE FROM community_groups;
DELETE FROM community_business_profiles;
DELETE FROM community_user_profiles;
DELETE FROM community_role_assignments;

-- Dealers (directory listings)
DELETE FROM dealer_auction_entries;
DELETE FROM dealer_documents;
DELETE FROM dealer_storefronts;
DELETE FROM dealer_members;
DELETE FROM dealers;

-- Reviews & notifications
DELETE FROM reviews;
DELETE FROM notification_logs;
DELETE FROM notifications;
DELETE FROM platform_notifications;
DELETE FROM platform_fraud_alerts;
DELETE FROM activity_logs;
DELETE FROM ai_insights;
DELETE FROM engagement_campaigns;
DELETE FROM scheduled_reminders;
DELETE FROM cms_banners;
DELETE FROM platform_banners;
DELETE FROM platform_cms_pages;
DELETE FROM support_tickets;
DELETE FROM uploaded_files;

COMMIT;

SELECT 'vehicles' AS tbl, COUNT(*)::text AS rows FROM vehicles
UNION ALL SELECT 'parts', COUNT(*)::text FROM parts
UNION ALL SELECT 'dealers', COUNT(*)::text FROM dealers
UNION ALL SELECT 'auctions', COUNT(*)::text FROM auctions
UNION ALL SELECT 'leads', COUNT(*)::text FROM leads
UNION ALL SELECT 'users', COUNT(*)::text FROM users;
