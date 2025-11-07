-- Migration: Add koreaboardgames_url to games table
-- Version: 0002
-- Date: 2025-11-07
-- Description: Add koreaboardgames_url column to store external product page link

-- Add koreaboardgames_url column to games table
ALTER TABLE games ADD COLUMN koreaboardgames_url TEXT;
