// Trace: SPEC-migration-workers-1, TASK-workers-001.2

/**
 * Database types for cheongram-board D1 database
 *
 * These types define the structure of data in the D1 SQLite database
 * and the filters/options used for querying.
 */

// ============================================================================
// Database Models
// ============================================================================

/**
 * Game entity
 * Represents a board game in the catalog
 */
export interface Game {
  id: number;
  title: string;
  min_players: number | null;
  max_players: number | null;
  play_time: number | null;
  complexity: 'low' | 'medium' | 'high' | null;
  description: string | null;
  image_url: string | null;
  koreaboardgames_url: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields (not in database)
  is_rented?: boolean;
  return_date?: string | null;
}

/**
 * Rental entity
 * Represents a game rental record
 */
export interface Rental {
  id: number;
  game_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  rented_at: string;
  due_date: string;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  games?: Game;
}

/**
 * Rental with game details
 * Used when fetching rentals with joined game information
 */
export interface RentalWithGame extends Rental {
  games: Game;
}

// ============================================================================
// Create/Update DTOs
// ============================================================================

/**
 * Data for creating a new game
 */
export interface CreateGameData {
  title: string;
  min_players?: number | null;
  max_players?: number | null;
  play_time?: number | null;
  complexity?: 'low' | 'medium' | 'high' | null;
  description?: string | null;
  image_url?: string | null;
  koreaboardgames_url?: string | null;
}

/**
 * Data for updating an existing game
 */
export interface UpdateGameData {
  title?: string;
  min_players?: number | null;
  max_players?: number | null;
  play_time?: number | null;
  complexity?: 'low' | 'medium' | 'high' | null;
  description?: string | null;
  image_url?: string | null;
  koreaboardgames_url?: string | null;
}

/**
 * Data for creating a new rental
 */
export interface CreateRentalData {
  game_id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  rented_at: string;
  due_date?: string;
  notes?: string | null;
}

/**
 * Data for updating an existing rental
 */
export interface UpdateRentalData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  rented_at?: string;
  due_date?: string;
  returned_at?: string | null;
  notes?: string | null;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for querying games
 */
export interface GameFilters {
  query?: string;                    // Search in title
  min_players?: number;              // Minimum players filter
  max_players?: number;              // Maximum players filter
  min_play_time?: number;            // Minimum play time filter
  max_play_time?: number;            // Maximum play time filter
  complexity?: 'low' | 'medium' | 'high';  // Complexity filter
  availability?: 'available' | 'rented';   // Availability status
  sort_by?: string;                  // Column to sort by
  sort_order?: 'asc' | 'desc';       // Sort direction
  page?: number;                     // Page number (1-indexed)
  limit?: number;                    // Items per page
}

/**
 * Filters for querying rentals
 */
export interface RentalFilters {
  query?: string;                    // Search in renter name
  game_id?: number;                  // Filter by game ID
  status?: 'active' | 'returned' | 'overdue';  // Rental status
  date_from?: string;                // Start date filter (rented_at >= date)
  date_to?: string;                  // End date filter (rented_at <= date)
  sort_by?: string;                  // Column to sort by
  sort_order?: 'asc' | 'desc';       // Sort direction
  page?: number;                     // Page number (1-indexed)
  limit?: number;                    // Items per page
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Database operation result
 */
export type DbResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: Error;
};
