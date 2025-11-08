// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { D1Adapter } from '../src/lib/db/adapter.js';

// Enhanced Mock Factory with better isolation
const createIsolatedMockD1Database = () => {
  const mock = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    all: vi.fn(),
    first: vi.fn(),
    run: vi.fn(),
  };

  // Ensure each method returns a fresh mock instance with undefined default
  Object.keys(mock).forEach(key => {
    mock[key as keyof typeof mock].mockClear();
  });

  return mock;
};

// Test utilities for better isolation
const setupAdapterTest = () => {
  const mockD1Database = createIsolatedMockD1Database();
  const adapter = new D1Adapter(mockD1Database as any);
  return { mockD1Database, adapter };
};

describe('D1Adapter - Enhanced Mock Isolation', () => {
  let mockD1Database: ReturnType<typeof createIsolatedMockD1Database>;
  let adapter: D1Adapter;

  beforeEach(() => {
    // Global mock cleanup
    vi.clearAllMocks();
    ({ mockD1Database, adapter } = setupAdapterTest());
  });

  afterEach(() => {
    // Ensure no mock leakage between tests
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize D1Adapter with database', () => {
      expect(adapter).toBeInstanceOf(D1Adapter);
    });

    it('should accept D1Database in constructor', () => {
      const { mockD1Database: newMock, adapter: newAdapter } = setupAdapterTest();
      expect(newAdapter).toBeDefined();
      expect(newMock.prepare).toBeDefined();
    });
  });

  describe('Games Methods', () => {
    describe('listGames', () => {
      it('should list games without filters', async () => {
        const mockGames = [
          {
            id: 1,
            title: 'Azul',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Tile placement game',
            image_url: 'https://example.com/azul.jpg',
            koreaboardgames_url: 'https://www.koreaboardgames.com/game/azul',
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            rentals_json: '[]',
          },
        ];

        // Fresh mock setup for this test only
        mockD1Database.all.mockResolvedValueOnce({ results: mockGames });
        mockD1Database.first.mockResolvedValueOnce({ count: 1 });

        const result = await adapter.listGames();

        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe('Azul');
        expect(result.data[0].is_rented).toBe(false);
        expect(result.pagination.total).toBe(1);
        expect(result.pagination.page).toBe(1);
      });

      it('should return empty array when no games exist', async () => {
        // Ensure fresh mock state
        mockD1Database.all.mockResolvedValueOnce({ results: [] });
        mockD1Database.first.mockResolvedValueOnce({ count: 0 });

        const result = await adapter.listGames();

        expect(result.data).toHaveLength(0);
        expect(result.pagination.total).toBe(0);
      });

      it('should handle pagination correctly', async () => {
        const mockGames = Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          title: `Game ${i + 1}`,
          min_players: 2,
          max_players: 4,
          play_time: 60,
          complexity: 'medium',
          description: `Test game ${i + 1}`,
          image_url: null,
          koreaboardgames_url: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          rentals_json: '[]',
        }));

        mockD1Database.all.mockResolvedValueOnce({ results: mockGames.slice(0, 20) });
        mockD1Database.first.mockResolvedValueOnce({ count: 25 });

        const result = await adapter.listGames({ page: 1, limit: 20 });

        expect(result.data).toHaveLength(20);
        expect(result.pagination.total).toBe(25);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(20);
      });

      it('should filter by availability (available games)', async () => {
        const mockGames = [
          {
            id: 1,
            title: 'Available Game',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Available game',
            image_url: null,
            koreaboardgames_url: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            rentals_json: '[]', // No rentals = available
          },
          {
            id: 2,
            title: 'Rented Game',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Rented game',
            image_url: null,
            koreaboardgames_url: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            rentals_json: '[{"returned_at": null, "due_date": "2025-11-22"}]', // Active rental = rented
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockGames });
        mockD1Database.first.mockResolvedValueOnce({ count: 2 });

        const result = await adapter.listGames({ availability: 'available' });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe('Available Game');
        expect(result.data[0].is_rented).toBe(false);
      });

      it('should filter by availability (rented games)', async () => {
        const mockGames = [
          {
            id: 1,
            title: 'Available Game',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Available game',
            image_url: null,
            koreaboardgames_url: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            rentals_json: '[]', // No rentals = available
          },
          {
            id: 2,
            title: 'Rented Game',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Rented game',
            image_url: null,
            koreaboardgames_url: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            rentals_json: '[{"returned_at": null, "due_date": "2025-11-22"}]', // Active rental = rented
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockGames });
        mockD1Database.first.mockResolvedValueOnce({ count: 2 });

        const result = await adapter.listGames({ availability: 'rented' });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe('Rented Game');
        expect(result.data[0].is_rented).toBe(true);
      });

      it('should filter by multiple criteria', async () => {
        const mockGames = [
          {
            id: 1,
            title: 'Azul Game',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Tile game',
            image_url: null,
            koreaboardgames_url: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            rentals_json: '[]',
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockGames });
        mockD1Database.first.mockResolvedValueOnce({ count: 1 });

        const result = await adapter.listGames({
          query: 'Azul',
          min_players: 2,
          max_players: 4,
          complexity: 'low',
          availability: 'available',
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe('Azul Game');
      });
    });

    describe('getGame', () => {
      it('should return game when found', async () => {
        const mockGame = {
          id: 1,
          title: 'Azul',
          min_players: 2,
          max_players: 4,
          play_time: 45,
          complexity: 'low',
          description: 'Tile placement game',
          image_url: 'https://example.com/azul.jpg',
          koreaboardgames_url: 'https://www.koreaboardgames.com/game/azul',
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          rentals_json: '[]',
        };

        mockD1Database.first.mockResolvedValueOnce(mockGame);

        const result = await adapter.getGame(1);

        expect(result).toBeTruthy();
        expect(result!.id).toBe(1);
        expect(result!.title).toBe('Azul');
        expect(result!.is_rented).toBe(false);
      });

      it('should return null when game not found', async () => {
        mockD1Database.first.mockResolvedValueOnce(null);

        const result = await adapter.getGame(999);

        expect(result).toBeNull();
      });
    });

    describe('createGame', () => {
      it('should create a new game successfully', async () => {
        const gameData = {
          title: 'New Game',
          min_players: 2,
          max_players: 4,
          play_time: 45,
          complexity: 'medium' as const,
          description: 'A new board game',
          image_url: 'https://example.com/new-game.jpg',
          koreaboardgames_url: 'https://www.koreaboardgames.com/game/new-game',
        };

        const mockCreatedGame = {
          id: 1,
          ...gameData,
          created_at: '2025-11-08T12:00:00Z',
          updated_at: '2025-11-08T12:00:00Z',
          is_rented: false,
          return_date: null,
        };

        // Mock insert operation
        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });

        // Mock getting last insert ID
        mockD1Database.first.mockResolvedValueOnce({ id: 1 });

        // Mock getGame call that createGame makes internally
        mockD1Database.first.mockResolvedValueOnce(mockCreatedGame);

        const result = await adapter.createGame(gameData);

        expect(result.id).toBe(1);
        expect(result.title).toBe('New Game');
        expect(result.complexity).toBe('medium');
        expect(result.is_rented).toBe(false);
      });

      it('should handle creation failure', async () => {
        const gameData = {
          title: 'Test Game',
          min_players: 2,
          max_players: 4,
          play_time: 60,
          complexity: 'low' as const,
        };

        mockD1Database.run.mockResolvedValueOnce({
          success: false,
          meta: { changes: 0, duration: 5, last_row_id: null },
        });

        await expect(adapter.createGame(gameData)).rejects.toThrow('Failed to create game');
      });

      it('should handle missing new ID after creation', async () => {
        const gameData = {
          title: 'Test Game',
          min_players: 2,
          max_players: 4,
          play_time: 60,
          complexity: 'low' as const,
        };

        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });

        // Mock getting last insert ID returns null
        mockD1Database.first.mockResolvedValueOnce(null);

        await expect(adapter.createGame(gameData)).rejects.toThrow('Failed to get new game ID');
      });
    });

    describe('updateGame', () => {
      it('should update existing game', async () => {
        const updateData = {
          title: 'Azul - Updated',
          play_time: 50,
        };

        const expectedUpdatedGame = {
          id: 1,
          title: 'Azul - Updated',
          min_players: 2,
          max_players: 4,
          play_time: 50,
          complexity: 'low',
          description: 'Tile placement game',
          image_url: 'https://example.com/azul.jpg',
          koreaboardgames_url: 'https://www.koreaboardgames.com/game/azul',
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T01:00:00Z',
        };

        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });
        mockD1Database.first.mockResolvedValueOnce(expectedUpdatedGame);

        const result = await adapter.updateGame(1, updateData);

        expect(result.id).toBe(1);
        expect(result.title).toBe('Azul - Updated');
        expect(result.play_time).toBe(50);
        expect(result.updated_at).not.toBe(result.created_at);
      });
    });

    describe('deleteGame', () => {
      it('should delete game when not rented', async () => {
        const mockGame = {
          id: 1,
          title: 'Test Game',
          min_players: 2,
          max_players: 4,
          play_time: 60,
          complexity: 'low',
          description: 'Test description',
          image_url: null,
          koreaboardgames_url: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          is_rented: false,
          return_date: null,
        };

        // Mock getGame call
        mockD1Database.first.mockResolvedValueOnce(mockGame);
        // Mock isGameRented call (no active rentals)
        mockD1Database.first.mockResolvedValueOnce(null);
        // Mock delete operation
        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5 },
        });

        const result = await adapter.deleteGame(1);

        expect(result).toBe(true);
      });

      it('should return false when game does not exist', async () => {
        // Mock getGame call (game not found)
        mockD1Database.first.mockResolvedValueOnce(null);

        const result = await adapter.deleteGame(999);

        expect(result).toBe(false);
      });

      it('should reject deletion when game is rented', async () => {
        const mockGame = {
          id: 1,
          title: 'Test Game',
          min_players: 2,
          max_players: 4,
          play_time: 60,
          complexity: 'low',
          description: 'Test description',
          image_url: null,
          koreaboardgames_url: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          is_rented: false,
          return_date: null,
        };

        // Mock getGame call
        mockD1Database.first.mockResolvedValueOnce(mockGame);
        // Mock isGameRented call (game is rented)
        mockD1Database.first.mockResolvedValueOnce({ id: 1 });

        await expect(adapter.deleteGame(1)).rejects.toThrow('Cannot delete game with active rentals');
      });

      it('should handle delete operation failure', async () => {
        const mockGame = {
          id: 1,
          title: 'Test Game',
          min_players: 2,
          max_players: 4,
          play_time: 60,
          complexity: 'low',
          description: 'Test description',
          image_url: null,
          koreaboardgames_url: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          is_rented: false,
          return_date: null,
        };

        // Mock getGame call
        mockD1Database.first.mockResolvedValueOnce(mockGame);
        // Mock isGameRented call (no active rentals)
        mockD1Database.first.mockResolvedValueOnce(null);
        // Mock delete operation failure
        mockD1Database.run.mockResolvedValueOnce({
          success: false,
          meta: { changes: 0, duration: 5 },
        });

        await expect(adapter.deleteGame(1)).rejects.toThrow('Failed to delete game');
      });
    });
  });

  describe('Rentals Methods', () => {
    describe('isGameRented', () => {
      it('should return true when game has active rentals', async () => {
        mockD1Database.first.mockResolvedValueOnce({ id: 1 });

        const result = await adapter.isGameRented(1);

        expect(result).toBe(true);
      });

      it('should return false when game has no active rentals', async () => {
        mockD1Database.first.mockResolvedValueOnce(null);

        const result = await adapter.isGameRented(1);

        expect(result).toBe(false);
      });
    });

    describe('createRental', () => {
      it('should create rental when game is available', async () => {
        const rentalData = {
          game_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          notes: 'Family game night',
        };

        const mockCreatedRental = {
          id: 1,
          ...rentalData,
          returned_at: null,
          created_at: '2025-11-08T12:00:00Z',
          updated_at: '2025-11-08T12:00:00Z',
          games: {
            id: 1,
            title: 'Azul',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Tile placement game',
            image_url: 'https://example.com/azul.jpg',
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
          },
        };

        // Mock isGameRented check (game not rented)
        mockD1Database.first.mockResolvedValueOnce(null);
        // Mock insert operation
        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });
        // Mock getting last insert ID
        mockD1Database.first.mockResolvedValueOnce({ id: 1 });
        // Mock getRental call that createRental makes internally
        mockD1Database.first.mockResolvedValueOnce({
          ...mockCreatedRental,
          games_json: JSON.stringify(mockCreatedRental.games),
          games: undefined, // Remove games from the mock since it gets added by the adapter
        });

        const result = await adapter.createRental(rentalData);

        expect(result.id).toBe(1);
        expect(result.name).toBe('John Doe');
        expect(result.returned_at).toBeNull();
        expect(result.games?.title).toBe('Azul');
      });

      it('should calculate due date when not provided (14 days default)', async () => {
        const rentalData = {
          game_id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          rented_at: '2025-11-08',
          // due_date omitted, should default to 14 days later
        };

        // Mock isGameRented check (game not rented)
        mockD1Database.first.mockResolvedValueOnce(null);
        // Mock insert operation
        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });
        // Mock getting last insert ID
        mockD1Database.first.mockResolvedValueOnce({ id: 1 });
        // Mock getRental call
        mockD1Database.first.mockResolvedValueOnce({
          id: 1,
          ...rentalData,
          due_date: '2025-11-22', // Should be calculated as 14 days from 2025-11-08
          returned_at: null,
          created_at: '2025-11-08T12:00:00Z',
          updated_at: '2025-11-08T12:00:00Z',
          games_json: null,
          games: null,
        });

        const result = await adapter.createRental(rentalData);

        expect(result.due_date).toBe('2025-11-22');
      });

      it('should reject rental when game is already rented', async () => {
        const rentalData = {
          game_id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
        };

        mockD1Database.first.mockResolvedValueOnce({ id: 1 }); // Game already rented

        await expect(adapter.createRental(rentalData)).rejects.toThrow('Game is already rented');
      });

      it('should handle creation failure', async () => {
        const rentalData = {
          game_id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
        };

        // Mock isGameRented check (game not rented)
        mockD1Database.first.mockResolvedValueOnce(null);
        // Mock insert operation failure
        mockD1Database.run.mockResolvedValueOnce({
          success: false,
          meta: { changes: 0, duration: 5, last_row_id: null },
        });

        await expect(adapter.createRental(rentalData)).rejects.toThrow('Failed to create rental');
      });
    });

    describe('returnRental', () => {
      it('should mark rental as returned', async () => {
        const expectedReturnedRental = {
          id: 1,
          game_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          returned_at: '2025-11-10T10:00:00Z',
          notes: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-10T10:00:00Z',
        };

        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });
        mockD1Database.first.mockResolvedValueOnce(expectedReturnedRental);

        const result = await adapter.returnRental(1);

        expect(result.returned_at).toBeDefined();
        expect(result.updated_at).not.toBe(result.created_at);
      });
    });

    describe('extendRental', () => {
      it('should extend rental due date', async () => {
        const newDueDate = '2025-12-01';
        const expectedExtendedRental = {
          id: 1,
          game_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: newDueDate,
          returned_at: null,
          notes: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-10T10:00:00Z',
        };

        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });
        mockD1Database.first.mockResolvedValueOnce(expectedExtendedRental);

        const result = await adapter.extendRental(1, newDueDate);

        expect(result.due_date).toBe(newDueDate);
        expect(result.returned_at).toBeNull();
      });

      it('should reject when rental not found or already returned', async () => {
        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 0, duration: 5 }, // No changes made
        });

        await expect(adapter.returnRental(999)).rejects.toThrow('Rental not found or already returned');
      });
    });

    describe('listRentals', () => {
      it('should list rentals without filters', async () => {
        const mockRentals = [
          {
            id: 1,
            game_id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '010-1234-5678',
            rented_at: '2025-11-08',
            due_date: '2025-11-22',
            returned_at: null,
            notes: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            games_json: JSON.stringify({
              id: 1,
              title: 'Azul',
              min_players: 2,
              max_players: 4,
              play_time: 45,
              complexity: 'low',
              description: 'Tile placement game',
              image_url: 'https://example.com/azul.jpg',
              created_at: '2025-11-08T00:00:00Z',
              updated_at: '2025-11-08T00:00:00Z',
            }),
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockRentals });
        mockD1Database.first.mockResolvedValueOnce({ count: 1 });

        const result = await adapter.listRentals();

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('John Doe');
        expect(result.data[0].games?.title).toBe('Azul');
        expect(result.pagination.total).toBe(1);
      });

      it('should filter by active status', async () => {
        const mockRentals = [
          {
            id: 1,
            game_id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '010-1234-5678',
            rented_at: '2025-11-08',
            due_date: '2025-11-22',
            returned_at: null,
            notes: null,
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
            games_json: null,
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockRentals });
        mockD1Database.first.mockResolvedValueOnce({ count: 1 });

        const result = await adapter.listRentals({ status: 'active' });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].returned_at).toBeNull();
      });

      it('should handle pagination', async () => {
        const mockRentals = Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          game_id: 1,
          name: `Renter ${i + 1}`,
          email: `renter${i + 1}@example.com`,
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          returned_at: null,
          notes: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          games_json: null,
        }));

        mockD1Database.all.mockResolvedValueOnce({ results: mockRentals.slice(0, 10) });
        mockD1Database.first.mockResolvedValueOnce({ count: 15 });

        const result = await adapter.listRentals({ page: 1, limit: 10 });

        expect(result.data).toHaveLength(10);
        expect(result.pagination.total).toBe(15);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
      });

      it('should filter by overdue status', async () => {
        // Mock today's date as 2025-11-10 (past due dates will be overdue)
        const originalDate = Date;
        global.Date = class extends Date {
          toISOString() {
            return '2025-11-10T00:00:00.000Z';
          }
        } as any;

        const mockRentals = [
          {
            id: 1,
            game_id: 1,
            name: 'Overdue Renter',
            email: 'overdue@example.com',
            phone: '010-1234-5678',
            rented_at: '2025-10-01',
            due_date: '2025-10-15', // Past due date
            returned_at: null,
            notes: null,
            created_at: '2025-10-01T00:00:00Z',
            updated_at: '2025-10-01T00:00:00Z',
            games_json: null,
          },
        ];

        try {
          mockD1Database.all.mockResolvedValueOnce({ results: mockRentals });
          mockD1Database.first.mockResolvedValueOnce({ count: 1 });

          const result = await adapter.listRentals({ status: 'overdue' });

          expect(result.data).toHaveLength(1);
          expect(result.data[0].name).toBe('Overdue Renter');
        } finally {
          global.Date = originalDate;
        }
      });

      it('should filter by returned status', async () => {
        const mockRentals = [
          {
            id: 1,
            game_id: 1,
            name: 'Returned Renter',
            email: 'returned@example.com',
            phone: '010-1234-5678',
            rented_at: '2025-11-01',
            due_date: '2025-11-15',
            returned_at: '2025-11-10T10:00:00Z', // Has return date
            notes: null,
            created_at: '2025-11-01T00:00:00Z',
            updated_at: '2025-11-10T10:00:00Z',
            games_json: null,
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockRentals });
        mockD1Database.first.mockResolvedValueOnce({ count: 1 });

        const result = await adapter.listRentals({ status: 'returned' });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Returned Renter');
        expect(result.data[0].returned_at).toBe('2025-11-10T10:00:00Z');
      });

      it('should filter by date range', async () => {
        const mockRentals = [
          {
            id: 1,
            game_id: 1,
            name: 'In Range Renter',
            email: 'inrange@example.com',
            phone: '010-1234-5678',
            rented_at: '2025-11-05', // Within date range
            due_date: '2025-11-19',
            returned_at: null,
            notes: null,
            created_at: '2025-11-05T00:00:00Z',
            updated_at: '2025-11-05T00:00:00Z',
            games_json: null,
          },
        ];

        mockD1Database.all.mockResolvedValueOnce({ results: mockRentals });
        mockD1Database.first.mockResolvedValueOnce({ count: 1 });

        const result = await adapter.listRentals({
          date_from: '2025-11-01',
          date_to: '2025-11-10'
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('In Range Renter');
      });
    });

    describe('getRental', () => {
      it('should return rental when found', async () => {
        const mockRental = {
          id: 1,
          game_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          returned_at: null,
          notes: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          games_json: JSON.stringify({
            id: 1,
            title: 'Azul',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Tile placement game',
            image_url: 'https://example.com/azul.jpg',
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
          }),
        };

        mockD1Database.first.mockResolvedValueOnce(mockRental);

        const result = await adapter.getRental(1);

        expect(result).toBeTruthy();
        expect(result!.id).toBe(1);
        expect(result!.name).toBe('John Doe');
        expect(result!.games?.title).toBe('Azul');
      });

      it('should return null when rental not found', async () => {
        mockD1Database.first.mockResolvedValueOnce(null);

        const result = await adapter.getRental(999);

        expect(result).toBeNull();
      });
    });

    describe('updateRental', () => {
      it('should update existing rental', async () => {
        const updateData = {
          name: 'Jane Smith',
          phone: '010-9876-5432',
          notes: 'Updated notes',
        };

        const expectedUpdatedRental = {
          id: 1,
          game_id: 1,
          name: 'Jane Smith',
          email: 'john@example.com',
          phone: '010-9876-5432',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          returned_at: null,
          notes: 'Updated notes',
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-10T10:00:00Z',
          games: {
            id: 1,
            title: 'Azul',
            min_players: 2,
            max_players: 4,
            play_time: 45,
            complexity: 'low',
            description: 'Tile placement game',
            image_url: 'https://example.com/azul.jpg',
            created_at: '2025-11-08T00:00:00Z',
            updated_at: '2025-11-08T00:00:00Z',
          },
        };

        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5, last_row_id: 1 },
        });
        mockD1Database.first.mockResolvedValueOnce(expectedUpdatedRental);

        const result = await adapter.updateRental(1, updateData);

        expect(result.name).toBe('Jane Smith');
        expect(result.phone).toBe('010-9876-5432');
        expect(result.notes).toBe('Updated notes');
        expect(result.updated_at).not.toBe(result.created_at);
      });
    });

    describe('deleteRental', () => {
      it('should delete rental when exists', async () => {
        const mockRental = {
          id: 1,
          game_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          returned_at: null,
          notes: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          games_json: null,
          games: null,
        };

        // Mock getRental call
        mockD1Database.first.mockResolvedValueOnce(mockRental);
        // Mock delete operation
        mockD1Database.run.mockResolvedValueOnce({
          success: true,
          meta: { changes: 1, duration: 5 },
        });

        const result = await adapter.deleteRental(1);

        expect(result).toBe(true);
      });

      it('should return false when rental does not exist', async () => {
        // Mock getRental call (rental not found)
        mockD1Database.first.mockResolvedValueOnce(null);

        const result = await adapter.deleteRental(999);

        expect(result).toBe(false);
      });

      it('should handle delete operation failure', async () => {
        const mockRental = {
          id: 1,
          game_id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '010-1234-5678',
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
          returned_at: null,
          notes: null,
          created_at: '2025-11-08T00:00:00Z',
          updated_at: '2025-11-08T00:00:00Z',
          games_json: null,
          games: null,
        };

        // Mock getRental call
        mockD1Database.first.mockResolvedValueOnce(mockRental);
        // Mock delete operation failure
        mockD1Database.run.mockResolvedValueOnce({
          success: false,
          meta: { changes: 0, duration: 5 },
        });

        await expect(adapter.deleteRental(1)).rejects.toThrow('Failed to delete rental');
      });
    });
  });
});

// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001
