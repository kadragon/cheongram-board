/**
 * Zod Validation Schemas
 * Centralized validation schemas for consistent data validation
 */

import { z } from 'zod';

// Common validation patterns
export const emailSchema = z.string().email('유효한 이메일 주소를 입력해주세요.');
export const phoneSchema = z.string()
  .regex(/^[0-9-+\s()]+$/, '유효한 전화번호를 입력해주세요.')
  .min(10, '전화번호는 최소 10자리여야 합니다.')
  .max(20, '전화번호는 최대 20자리까지 입력 가능합니다.');

export const urlSchema = z.string().url('유효한 URL을 입력해주세요.');
export const positiveIntSchema = z.number().int().positive('양의 정수를 입력해주세요.');
export const nonEmptyStringSchema = z.string().min(1, '이 필드는 필수입니다.');

// Game validation schemas
export const gameCreateSchema = z.object({
  title: z.string()
    .min(1, '게임 제목은 필수입니다.')
    .max(200, '게임 제목은 200자를 초과할 수 없습니다.'),
  description: z.string()
    .max(1000, '게임 설명은 1000자를 초과할 수 없습니다.')
    .optional(),
  image_url: urlSchema.refine(
    (url) => url.match(/\.(jpg|jpeg|png|gif|webp)$/i),
    '이미지 URL은 jpg, jpeg, png, gif, webp 형식이어야 합니다.'
  ),
  koreaboardgames_url: urlSchema,
  min_players: z.number()
    .int('최소 플레이어 수는 정수여야 합니다.')
    .min(1, '최소 플레이어 수는 1명 이상이어야 합니다.')
    .max(20, '최소 플레이어 수는 20명을 초과할 수 없습니다.'),
  max_players: z.number()
    .int('최대 플레이어 수는 정수여야 합니다.')
    .min(1, '최대 플레이어 수는 1명 이상이어야 합니다.')
    .max(50, '최대 플레이어 수는 50명을 초과할 수 없습니다.'),
  play_time: z.number()
    .int('플레이 시간은 정수여야 합니다.')
    .min(1, '플레이 시간은 1분 이상이어야 합니다.')
    .max(1440, '플레이 시간은 1440분(24시간)을 초과할 수 없습니다.'),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  categories: z.array(z.string()).optional(),
}).refine(
  (data) => data.min_players <= data.max_players,
  {
    message: '최소 플레이어 수는 최대 플레이어 수보다 작거나 같아야 합니다.',
    path: ['max_players'],
  }
);

export const gameUpdateSchema = gameCreateSchema.partial();

// Rental validation schemas
export const rentalCreateSchema = z.object({
  name: z.string()
    .min(1, '대여자 이름은 필수입니다.')
    .max(100, '대여자 이름은 100자를 초과할 수 없습니다.')
    .regex(/^[가-힣a-zA-Z\s]+$/, '대여자 이름은 한글, 영문, 공백만 입력 가능합니다.'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  game_id: positiveIntSchema,
  rented_at: z.string()
    .datetime('유효한 날짜 형식을 입력해주세요.')
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')),
  due_date: z.string()
    .datetime('유효한 날짜 형식을 입력해주세요.')
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.'))
    .optional(),
  notes: z.string()
    .max(500, '메모는 500자를 초과할 수 없습니다.')
    .optional(),
}).refine(
  (data) => {
    if (!data.email && !data.phone) {
      return false;
    }
    return true;
  },
  {
    message: '이메일 또는 전화번호 중 하나는 필수입니다.',
    path: ['email'],
  }
);

export const rentalUpdateSchema = z.object({
  name: z.string()
    .min(1, '대여자 이름은 필수입니다.')
    .max(100, '대여자 이름은 100자를 초과할 수 없습니다.')
    .optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  due_date: z.string()
    .datetime('유효한 날짜 형식을 입력해주세요.')
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.'))
    .optional(),
  returned_at: z.string()
    .datetime('유효한 날짜 형식을 입력해주세요.')
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.'))
    .optional(),
  notes: z.string()
    .max(500, '메모는 500자를 초과할 수 없습니다.')
    .optional(),
});

// Search and filter schemas
export const gameSearchSchema = z.object({
  query: z.string().max(200, '검색어는 200자를 초과할 수 없습니다.').optional(),
  min_players: z.number().int().min(1).max(50).optional(),
  max_players: z.number().int().min(1).max(50).optional(),
  min_play_time: z.number().int().min(1).max(1440).optional(),
  max_play_time: z.number().int().min(1).max(1440).optional(),
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  categories: z.array(z.string()).optional(),
  availability: z.enum(['available', 'rented', 'all']).optional(),
  sort_by: z.enum(['title', 'min_players', 'max_players', 'play_time', 'created_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const rentalSearchSchema = z.object({
  query: z.string().max(200, '검색어는 200자를 초과할 수 없습니다.').optional(),
  status: z.enum(['active', 'returned', 'overdue', 'all']).optional(),
  game_id: positiveIntSchema.optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.').optional(),
  sort_by: z.enum(['name', 'rented_at', 'due_date', 'returned_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Admin validation schemas
export const adminActionSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'extend', 'return']),
  resource: z.enum(['game', 'rental']),
  resource_id: positiveIntSchema.optional(),
  data: z.any().optional(),
  reason: z.string().max(200, '사유는 200자를 초과할 수 없습니다.').optional(),
});

// Export validation schemas
export const exportRequestSchema = z.object({
  type: z.enum(['games', 'rentals', 'analytics']),
  format: z.enum(['csv', 'excel', 'pdf']),
  filters: z.any().optional(),
  date_range: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.'),
  }).optional(),
});

// Type exports for TypeScript
export type GameCreateInput = z.infer<typeof gameCreateSchema>;
export type GameUpdateInput = z.infer<typeof gameUpdateSchema>;
export type RentalCreateInput = z.infer<typeof rentalCreateSchema>;
export type RentalUpdateInput = z.infer<typeof rentalUpdateSchema>;
export type GameSearchInput = z.infer<typeof gameSearchSchema>;
export type RentalSearchInput = z.infer<typeof rentalSearchSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
export type ExportRequestInput = z.infer<typeof exportRequestSchema>;