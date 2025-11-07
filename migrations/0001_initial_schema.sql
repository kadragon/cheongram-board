-- Migration: Initial schema for cheongram-board
-- Version: 0001
-- Date: 2025-11-06
-- Description: Create games and rentals tables for board game rental system

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Games table
-- Stores board game catalog information
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK(length(title) > 0),
  min_players INTEGER CHECK(min_players > 0),
  max_players INTEGER CHECK(max_players >= min_players),
  play_time INTEGER CHECK(play_time > 0),
  complexity TEXT CHECK(complexity IN ('low', 'medium', 'high')),
  description TEXT,
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Rentals table
-- Stores rental records with references to games
CREATE TABLE IF NOT EXISTS rentals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL CHECK(length(name) > 0),
  email TEXT,
  phone TEXT,
  rented_at TEXT NOT NULL,
  due_date TEXT NOT NULL,
  returned_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Indexes for games table
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_games_complexity ON games(complexity);
CREATE INDEX IF NOT EXISTS idx_games_players ON games(min_players, max_players);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Indexes for rentals table
CREATE INDEX IF NOT EXISTS idx_rentals_game_id ON rentals(game_id);
CREATE INDEX IF NOT EXISTS idx_rentals_returned_at ON rentals(returned_at);
CREATE INDEX IF NOT EXISTS idx_rentals_rented_at ON rentals(rented_at);
CREATE INDEX IF NOT EXISTS idx_rentals_due_date ON rentals(due_date);

-- Partial index for active rentals (not returned)
-- This improves query performance for checking game availability
CREATE INDEX IF NOT EXISTS idx_rentals_active
  ON rentals(game_id, returned_at)
  WHERE returned_at IS NULL;

-- Partial index for overdue rentals
-- Helps with finding rentals past their due date
CREATE INDEX IF NOT EXISTS idx_rentals_overdue
  ON rentals(due_date, returned_at)
  WHERE returned_at IS NULL;
