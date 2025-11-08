// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001

import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  phoneSchema,
  urlSchema,
  positiveIntSchema,
  nonEmptyStringSchema,
  gameCreateSchema,
  gameUpdateSchema,
  rentalCreateSchema,
  rentalExtendSchema,
  gameSearchSchema,
  rentalSearchSchema,
} from '../src/lib/validation/schemas.js';

describe('Validation Schemas', () => {
  describe('Common Validation Patterns', () => {
    describe('emailSchema', () => {
      it('should validate valid email addresses', () => {
        expect(() => emailSchema.parse('test@example.com')).not.toThrow();
        expect(() => emailSchema.parse('user.name+tag@example.co.uk')).not.toThrow();
      });

      it('should reject invalid email addresses', () => {
        expect(() => emailSchema.parse('invalid-email')).toThrow();
        expect(() => emailSchema.parse('test@')).toThrow();
        expect(() => emailSchema.parse('@example.com')).toThrow();
      });
    });

    describe('phoneSchema', () => {
      it('should validate valid phone numbers', () => {
        expect(() => phoneSchema.parse('010-1234-5678')).not.toThrow();
        expect(() => phoneSchema.parse('02-123-4567')).not.toThrow();
        expect(() => phoneSchema.parse('+82-10-1234-5678')).not.toThrow();
      });

      it('should reject invalid phone numbers', () => {
        expect(() => phoneSchema.parse('abc')).toThrow();
        expect(() => phoneSchema.parse('123')).toThrow(); // too short
        expect(() => phoneSchema.parse('123456789012345678901')).toThrow(); // too long
      });
    });

    describe('urlSchema', () => {
      it('should validate valid URLs', () => {
        expect(() => urlSchema.parse('https://example.com')).not.toThrow();
        expect(() => urlSchema.parse('http://example.com/path')).not.toThrow();
      });

      it('should reject invalid URLs', () => {
        expect(() => urlSchema.parse('not-a-url')).toThrow();
        expect(() => urlSchema.parse('example.com')).toThrow(); // missing protocol
        expect(() => urlSchema.parse('')).toThrow(); // empty string
      });
    });

    describe('positiveIntSchema', () => {
      it('should validate positive integers', () => {
        expect(() => positiveIntSchema.parse(1)).not.toThrow();
        expect(() => positiveIntSchema.parse(100)).not.toThrow();
      });

      it('should reject non-positive numbers', () => {
        expect(() => positiveIntSchema.parse(0)).toThrow();
        expect(() => positiveIntSchema.parse(-1)).toThrow();
        expect(() => positiveIntSchema.parse(1.5)).toThrow();
      });
    });

    describe('nonEmptyStringSchema', () => {
      it('should validate non-empty strings', () => {
        expect(() => nonEmptyStringSchema.parse('test')).not.toThrow();
        expect(() => nonEmptyStringSchema.parse('a')).not.toThrow();
      });

      it('should reject empty strings', () => {
        expect(() => nonEmptyStringSchema.parse('')).toThrow();
        expect(() => nonEmptyStringSchema.parse('   ')).not.toThrow(); // spaces are allowed
      });
    });
  });

  describe('Game Validation Schemas', () => {
    describe('gameCreateSchema', () => {
      it('should validate valid game creation data', () => {
        const validGame = {
          title: 'Azul',
          min_players: 2,
          max_players: 4,
          play_time: 45,
          complexity: 'low' as const,
        };
        expect(() => gameCreateSchema.parse(validGame)).not.toThrow();
      });

      it('should validate with optional fields', () => {
        const gameWithOptionals = {
          title: 'Test Game',
          description: 'A test game',
          image_url: 'https://example.com/image.jpg',
          koreaboardgames_url: 'https://www.koreaboardgames.com/game/test',
        };
        expect(() => gameCreateSchema.parse(gameWithOptionals)).not.toThrow();
      });

      it('should reject when title is missing', () => {
        const invalidGame = {
          min_players: 2,
          max_players: 4,
        };
        expect(() => gameCreateSchema.parse(invalidGame)).toThrow();
      });

      it('should reject when min_players > max_players', () => {
        const invalidGame = {
          title: 'Invalid Game',
          min_players: 4,
          max_players: 2,
        };
        expect(() => gameCreateSchema.parse(invalidGame)).toThrow();
      });
    });

    describe('gameUpdateSchema', () => {
      it('should allow partial updates', () => {
        const partialUpdate = { title: 'Updated Title' };
        expect(() => gameUpdateSchema.parse(partialUpdate)).not.toThrow();
      });

      it('should validate partial data correctly', () => {
        const invalidUpdate = { min_players: -1 };
        expect(() => gameUpdateSchema.parse(invalidUpdate)).toThrow();
      });
    });
  });

  describe('Rental Validation Schemas', () => {
    describe('rentalCreateSchema', () => {
      it('should validate valid rental creation data', () => {
        const validRental = {
          name: 'John Doe',
          email: 'john@example.com',
          game_id: 1,
          rented_at: '2025-11-08',
          due_date: '2025-11-22',
        };
        expect(() => rentalCreateSchema.parse(validRental)).not.toThrow();
      });

      it('should require either email or phone', () => {
        const rentalWithoutContact = {
          name: 'John Doe',
          game_id: 1,
          rented_at: '2025-11-08',
        };
        expect(() => rentalCreateSchema.parse(rentalWithoutContact)).toThrow();
      });

      it('should accept phone instead of email', () => {
        const rentalWithPhone = {
          name: 'John Doe',
          phone: '010-1234-5678',
          game_id: 1,
          rented_at: '2025-11-08',
        };
        expect(() => rentalCreateSchema.parse(rentalWithPhone)).not.toThrow();
      });
    });

    describe('rentalExtendSchema', () => {
      it('should validate valid extension data', () => {
        const validExtension = {
          new_due_date: '2025-12-01',
        };
        expect(() => rentalExtendSchema.parse(validExtension)).not.toThrow();
      });

      it('should reject invalid date format', () => {
        const invalidExtension = {
          new_due_date: '2025/12/01',
        };
        expect(() => rentalExtendSchema.parse(invalidExtension)).toThrow();
      });
    });
  });

  describe('Search and Filter Schemas', () => {
    describe('gameSearchSchema', () => {
      it('should validate valid search parameters', () => {
        const validSearch = {
          query: 'board game',
          min_players: 2,
          max_players: 4,
          complexity: 'medium' as const,
          sort_by: 'title' as const,
          sort_order: 'asc' as const,
          page: 1,
          limit: 20,
        };
        expect(() => gameSearchSchema.parse(validSearch)).not.toThrow();
      });

      it('should allow empty search', () => {
        expect(() => gameSearchSchema.parse({})).not.toThrow();
      });
    });

    describe('rentalSearchSchema', () => {
      it('should validate valid rental search parameters', () => {
        const validSearch = {
          query: 'john',
          status: 'active' as const,
          date_from: '2025-01-01',
          date_to: '2025-12-31',
          sort_by: 'rented_at' as const,
          sort_order: 'desc' as const,
        };
        expect(() => rentalSearchSchema.parse(validSearch)).not.toThrow();
      });
    });
  });
});

// Trace: SPEC-test-coverage-improvement-1, TASK-test-coverage-001
