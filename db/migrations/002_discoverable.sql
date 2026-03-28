-- Migration 002: add discoverable flag to user
-- Run against existing databases (safe to run multiple times via IF NOT EXISTS).

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "discoverable" BOOLEAN NOT NULL DEFAULT TRUE;
