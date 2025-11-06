/**
 * D1 Database Adapter
 *
 * Provides a clean interface for interacting with the Cloudflare D1 database.
 * Handles SQL query construction, parameter binding, and result mapping.
 */

import type {
  D1Database,
  Game,
  Rental,
  CreateGameData,
  UpdateGameData,
  CreateRentalData,
  UpdateRentalData,
  GameFilters,
  RentalFilters,
  PaginatedResult,
} from './types';

/**
 * D1 Database Adapter Class
 *
 * Encapsulates all database operations for games and rentals.
 */
export class D1Adapter {
  constructor(private db: D1Database) {}

  // ==========================================================================
  // Games Methods
  // ==========================================================================

  /**
   * List games with optional filters and pagination
   */
  async listGames(filters: GameFilters = {}): Promise<PaginatedResult<Game>> {
    const {
      query,
      min_players,
      max_players,
      min_play_time,
      max_play_time,
      complexity,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (query) {
      conditions.push('title LIKE ?');
      params.push(`%${query}%`);
    }

    if (min_players !== undefined) {
      conditions.push('min_players >= ?');
      params.push(min_players);
    }

    if (max_players !== undefined) {
      conditions.push('max_players <= ?');
      params.push(max_players);
    }

    if (min_play_time !== undefined) {
      conditions.push('play_time >= ?');
      params.push(min_play_time);
    }

    if (max_play_time !== undefined) {
      conditions.push('play_time <= ?');
      params.push(max_play_time);
    }

    if (complexity) {
      conditions.push('complexity = ?');
      params.push(complexity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build main query with rentals info
    const offset = (page - 1) * limit;
    const sql = `
      SELECT g.*,
        (
          SELECT json_group_array(
            json_object('returned_at', r.returned_at, 'due_date', r.due_date)
          )
          FROM rentals r
          WHERE r.game_id = g.id
        ) as rentals_json
      FROM games g
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    // Execute query
    const result = await this.db.prepare(sql).bind(...params).all<Game>();

    // Get total count for pagination
    const countSql = `SELECT COUNT(*) as count FROM games ${whereClause}`;
    const countResult = await this.db
      .prepare(countSql)
      .bind(...params.slice(0, -2)) // Remove limit and offset
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Process results to add is_rented and return_date
    const games = result.results.map((game: any) => {
      let rentals = [];
      try {
        rentals = JSON.parse(game.rentals_json || '[]');
      } catch (e) {
        rentals = [];
      }

      const activeRental = rentals.find((r: any) => r.returned_at === null);
      const { rentals_json, ...gameData } = game;

      return {
        ...gameData,
        is_rented: !!activeRental,
        return_date: activeRental?.due_date || null,
      };
    });

    // Apply availability filter (post-processing since it requires rental join)
    let filteredGames = games;
    if (filters.availability === 'available') {
      filteredGames = games.filter((g) => !g.is_rented);
    } else if (filters.availability === 'rented') {
      filteredGames = games.filter((g) => g.is_rented);
    }

    return {
      data: filteredGames,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single game by ID with rental information
   */
  async getGame(id: number): Promise<Game | null> {
    const sql = `
      SELECT g.*,
        (
          SELECT json_group_array(
            json_object('returned_at', r.returned_at, 'due_date', r.due_date)
          )
          FROM rentals r
          WHERE r.game_id = g.id
        ) as rentals_json
      FROM games g
      WHERE g.id = ?
    `;

    const result = await this.db.prepare(sql).bind(id).first<any>();

    if (!result) {
      return null;
    }

    let rentals = [];
    try {
      rentals = JSON.parse(result.rentals_json || '[]');
    } catch (e) {
      rentals = [];
    }

    const activeRental = rentals.find((r: any) => r.returned_at === null);
    const { rentals_json, ...gameData } = result;

    return {
      ...gameData,
      is_rented: !!activeRental,
      return_date: activeRental?.due_date || null,
    };
  }

  /**
   * Create a new game
   */
  async createGame(data: CreateGameData): Promise<Game> {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const sql = `
      INSERT INTO games (
        title, min_players, max_players, play_time,
        complexity, description, image_url,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db
      .prepare(sql)
      .bind(
        data.title,
        data.min_players ?? null,
        data.max_players ?? null,
        data.play_time ?? null,
        data.complexity ?? null,
        data.description ?? null,
        data.image_url ?? null,
        now,
        now
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create game');
    }

    // Get the last inserted ID
    const lastIdResult = await this.db
      .prepare('SELECT last_insert_rowid() as id')
      .first<{ id: number }>();

    const newId = lastIdResult?.id;
    if (!newId) {
      throw new Error('Failed to get new game ID');
    }

    // Fetch and return the created game
    const game = await this.getGame(newId);
    if (!game) {
      throw new Error('Failed to fetch created game');
    }

    return game;
  }

  /**
   * Update an existing game
   */
  async updateGame(id: number, data: UpdateGameData): Promise<Game> {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Build SET clause dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.min_players !== undefined) {
      updates.push('min_players = ?');
      params.push(data.min_players);
    }
    if (data.max_players !== undefined) {
      updates.push('max_players = ?');
      params.push(data.max_players);
    }
    if (data.play_time !== undefined) {
      updates.push('play_time = ?');
      params.push(data.play_time);
    }
    if (data.complexity !== undefined) {
      updates.push('complexity = ?');
      params.push(data.complexity);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(data.image_url);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const sql = `UPDATE games SET ${updates.join(', ')} WHERE id = ?`;

    const result = await this.db.prepare(sql).bind(...params).run();

    if (!result.success) {
      throw new Error('Failed to update game');
    }

    // Fetch and return the updated game
    const game = await this.getGame(id);
    if (!game) {
      throw new Error('Game not found after update');
    }

    return game;
  }

  /**
   * Delete a game
   * Checks for existence and active rentals before deletion
   * @returns true if game was deleted, false if game not found
   * @throws Error if game has active rentals or deletion fails
   */
  async deleteGame(id: number): Promise<boolean> {
    // Check if game exists
    const existingGame = await this.getGame(id);
    if (!existingGame) {
      return false;
    }

    // Check for active rentals
    const isRented = await this.isGameRented(id);
    if (isRented) {
      throw new Error('Cannot delete game with active rentals');
    }

    // Delete the game
    const sql = 'DELETE FROM games WHERE id = ?';
    const result = await this.db.prepare(sql).bind(id).run();

    if (!result.success) {
      throw new Error('Failed to delete game');
    }

    return true;
  }

  // ==========================================================================
  // Rentals Methods
  // ==========================================================================

  /**
   * List rentals with optional filters and pagination
   */
  async listRentals(filters: RentalFilters = {}): Promise<PaginatedResult<Rental>> {
    const {
      query,
      game_id,
      status,
      date_from,
      date_to,
      sort_by = 'rented_at',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (query) {
      conditions.push('r.name LIKE ?');
      params.push(`%${query}%`);
    }

    if (game_id !== undefined) {
      conditions.push('r.game_id = ?');
      params.push(game_id);
    }

    if (status === 'active') {
      conditions.push('r.returned_at IS NULL');
    } else if (status === 'returned') {
      conditions.push('r.returned_at IS NOT NULL');
    } else if (status === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      conditions.push('r.returned_at IS NULL AND r.due_date < ?');
      params.push(today);
    }

    if (date_from) {
      conditions.push('r.rented_at >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('r.rented_at <= ?');
      params.push(date_to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build main query with game info
    const offset = (page - 1) * limit;
    const sql = `
      SELECT r.*,
        json_object(
          'id', g.id,
          'title', g.title,
          'min_players', g.min_players,
          'max_players', g.max_players,
          'play_time', g.play_time,
          'complexity', g.complexity,
          'description', g.description,
          'image_url', g.image_url,
          'created_at', g.created_at,
          'updated_at', g.updated_at
        ) as games_json
      FROM rentals r
      LEFT JOIN games g ON r.game_id = g.id
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    // Execute query
    const result = await this.db.prepare(sql).bind(...params).all<any>();

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM rentals r ${whereClause}`;
    const countResult = await this.db
      .prepare(countSql)
      .bind(...params.slice(0, -2))
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Process results
    const rentals = result.results.map((rental: any) => {
      let games = null;
      try {
        games = JSON.parse(rental.games_json);
      } catch (e) {
        games = null;
      }

      const { games_json, ...rentalData } = rental;

      return {
        ...rentalData,
        games,
      };
    });

    return {
      data: rentals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single rental by ID
   */
  async getRental(id: number): Promise<Rental | null> {
    const sql = `
      SELECT r.*,
        json_object(
          'id', g.id,
          'title', g.title,
          'min_players', g.min_players,
          'max_players', g.max_players,
          'play_time', g.play_time,
          'complexity', g.complexity,
          'description', g.description,
          'image_url', g.image_url,
          'created_at', g.created_at,
          'updated_at', g.updated_at
        ) as games_json
      FROM rentals r
      LEFT JOIN games g ON r.game_id = g.id
      WHERE r.id = ?
    `;

    const result = await this.db.prepare(sql).bind(id).first<any>();

    if (!result) {
      return null;
    }

    let games = null;
    try {
      games = JSON.parse(result.games_json);
    } catch (e) {
      games = null;
    }

    const { games_json, ...rentalData } = result;

    return {
      ...rentalData,
      games,
    };
  }

  /**
   * Check if a game is currently rented
   */
  async isGameRented(gameId: number): Promise<boolean> {
    const sql = `
      SELECT id FROM rentals
      WHERE game_id = ? AND returned_at IS NULL
      LIMIT 1
    `;

    const result = await this.db.prepare(sql).bind(gameId).first();
    return result !== null;
  }

  /**
   * Create a new rental
   * Throws an error if the game is already rented
   */
  async createRental(data: CreateRentalData): Promise<Rental> {
    // Check if game is already rented
    const isRented = await this.isGameRented(data.game_id);
    if (isRented) {
      throw new Error('Game is already rented');
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Calculate due date if not provided (14 days from rental date)
    let dueDate = data.due_date;
    if (!dueDate) {
      const rentalDate = new Date(data.rented_at);
      rentalDate.setDate(rentalDate.getDate() + 14);
      dueDate = rentalDate.toISOString().split('T')[0];
    }

    const sql = `
      INSERT INTO rentals (
        game_id, name, email, phone, rented_at, due_date, notes,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.db
      .prepare(sql)
      .bind(
        data.game_id,
        data.name,
        data.email ?? null,
        data.phone ?? null,
        data.rented_at,
        dueDate,
        data.notes ?? null,
        now,
        now
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create rental');
    }

    // Get the last inserted ID
    const lastIdResult = await this.db
      .prepare('SELECT last_insert_rowid() as id')
      .first<{ id: number }>();

    const newId = lastIdResult?.id;
    if (!newId) {
      throw new Error('Failed to get new rental ID');
    }

    // Fetch and return the created rental
    const rental = await this.getRental(newId);
    if (!rental) {
      throw new Error('Failed to fetch created rental');
    }

    return rental;
  }

  /**
   * Return a rental (mark as returned)
   */
  async returnRental(id: number): Promise<Rental> {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const sql = `
      UPDATE rentals
      SET returned_at = ?, updated_at = ?
      WHERE id = ? AND returned_at IS NULL
    `;

    const result = await this.db.prepare(sql).bind(now, now, id).run();

    if (!result.success) {
      throw new Error('Failed to return rental');
    }

    // Fetch and return the updated rental
    const rental = await this.getRental(id);
    if (!rental) {
      throw new Error('Rental not found after return');
    }

    return rental;
  }

  /**
   * Extend a rental's due date
   */
  async extendRental(id: number, newDueDate: string): Promise<Rental> {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const sql = `
      UPDATE rentals
      SET due_date = ?, updated_at = ?
      WHERE id = ? AND returned_at IS NULL
    `;

    const result = await this.db.prepare(sql).bind(newDueDate, now, id).run();

    if (!result.success) {
      throw new Error('Failed to extend rental');
    }

    // Fetch and return the updated rental
    const rental = await this.getRental(id);
    if (!rental) {
      throw new Error('Rental not found after extension');
    }

    return rental;
  }

  /**
   * Update a rental
   */
  async updateRental(id: number, data: UpdateRentalData): Promise<Rental> {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Build SET clause dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone);
    }
    if (data.rented_at !== undefined) {
      updates.push('rented_at = ?');
      params.push(data.rented_at);
    }
    if (data.due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(data.due_date);
    }
    if (data.returned_at !== undefined) {
      updates.push('returned_at = ?');
      params.push(data.returned_at);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const sql = `UPDATE rentals SET ${updates.join(', ')} WHERE id = ?`;

    const result = await this.db.prepare(sql).bind(...params).run();

    if (!result.success) {
      throw new Error('Failed to update rental');
    }

    // Fetch and return the updated rental
    const rental = await this.getRental(id);
    if (!rental) {
      throw new Error('Rental not found after update');
    }

    return rental;
  }

  /**
   * Delete a rental
   * Checks for existence before deletion
   * @returns true if rental was deleted, false if rental not found
   * @throws Error if deletion fails
   */
  async deleteRental(id: number): Promise<boolean> {
    // Check if rental exists
    const existingRental = await this.getRental(id);
    if (!existingRental) {
      return false;
    }

    const sql = 'DELETE FROM rentals WHERE id = ?';
    const result = await this.db.prepare(sql).bind(id).run();

    if (!result.success) {
      throw new Error('Failed to delete rental');
    }

    return true;
  }
}
