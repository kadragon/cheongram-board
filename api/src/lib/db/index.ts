// Trace: SPEC-migration-workers-1, TASK-workers-001.2

/**
 * Database Module Exports
 *
 * Central export point for all database-related functionality.
 */

export { D1Adapter } from './adapter';
export type {
  Game,
  Rental,
  RentalWithGame,
  CreateGameData,
  UpdateGameData,
  CreateRentalData,
  UpdateRentalData,
  GameFilters,
  RentalFilters,
  PaginatedResult,
  DbResult,
} from './types';
