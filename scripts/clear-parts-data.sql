-- Clear all parts marketplace data (PostgreSQL)
-- Run: docker exec -i motorcart-postgres-1 psql -U motorcart -d motorcart -f - < scripts/clear-parts-data.sql

BEGIN;

DELETE FROM part_order_items;
DELETE FROM part_orders;
DELETE FROM reviews WHERE entity_type = 'part';
DELETE FROM parts;

COMMIT;

SELECT COUNT(*) AS parts_remaining FROM parts;
