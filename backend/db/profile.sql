-- ============================================================
-- Week 5: Extended patient + doctor profile fields
-- Adds optional columns to the users table for richer profiles.
-- Idempotent: safe to run more than once.
-- ============================================================

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS medical_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

COMMIT;