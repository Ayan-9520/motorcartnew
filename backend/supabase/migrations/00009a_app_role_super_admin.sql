-- Run BEFORE 00009 (or alone if 00009 failed with 55P04).
-- PostgreSQL cannot use a new enum label in the same transaction that adds it.

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
