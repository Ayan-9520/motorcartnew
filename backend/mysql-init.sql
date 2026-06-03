-- ============================================================
-- Motorcart.in — MySQL (XAMPP / phpMyAdmin)
-- Supabase Postgres SQL yahan IMPORT MAT KARO
-- Tables Prisma se banti hain (70 tables)
-- ============================================================

CREATE DATABASE IF NOT EXISTS motorcart
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE motorcart;

-- Iske baad TERMINAL se chalao (phpMyAdmin SQL tab se nahi):
--
--   cd backend
--   npm install
--   npx prisma generate
--   npx prisma db push
--   npm run db:seed
--
-- Verify tables:
--   npx tsx scripts/list-tables.ts
--
-- phpMyAdmin mein F5 refresh karo — 70 tables dikhengi:
--   users, vehicles, dealers, auctions, parts, bookings, ...
