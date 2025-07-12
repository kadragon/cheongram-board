import { createRouteHandlerClient } from "@supabase/ssr";
import { GET, POST } from "@/app/api/rentals/route";
import { PUT as PUT_EXTEND } from "@/app/api/rentals/[id]/extend/route";
import { PUT as PUT_RETURN } from "@/app/api/rentals/[id]/return/route";

// Mock Supabase
jest.mock("@supabase/ssr", () => ({
  createRouteHandlerClient: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getSession: jest.fn(),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);
});

describe("Rental Management API", () => {
  describe("GET /api/rentals", () => {
    it("should return a list of rentals", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: "user-123" } } },
      });
      const mockRentals = [{ id: 1, game_id: 1, games: { name: "Game 1" } }];
      mockSupabase.select.mockResolvedValueOnce({ data: mockRentals, error: null });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockRentals);
    });
  });

  describe("POST /api/rentals", () => {
    it("should create a new rental", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: "user-123" } } },
      });
      const newRental = { game_id: 1, user_id: "user-123" };
      mockSupabase.select.mockResolvedValueOnce({ data: [{ id: 2, ...newRental }], error: null });

      const request = new Request("http://localhost/api/rentals", {
        method: "POST",
        body: JSON.stringify(newRental),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(mockSupabase.insert).toHaveBeenCalledWith(newRental);
    });
  });

  describe("PUT /api/rentals/[id]/extend", () => {
    it("should extend a rental's due date", async () => {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
            data: { session: { user: { id: "user-123" } } },
          });
      const newDueDate = { due_date: "2025-12-31T23:59:59Z" };
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 1, ...newDueDate }, error: null });

      const request = new Request("http://localhost/api/rentals/1/extend", {
        method: "PUT",
        body: JSON.stringify(newDueDate),
      });
      const response = await PUT_EXTEND(request, { params: { id: "1" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(newDueDate);
    });
  });

  describe("PUT /api/rentals/[id]/return", () => {
    it("should mark a rental as returned", async () => {
        mockSupabase.auth.getSession.mockResolvedValueOnce({
            data: { session: { user: { id: "user-123" } } },
          });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 1, status: 'returned' }, error: null });

      const request = new Request("http://localhost/api/rentals/1/return", {
        method: "PUT",
      });
      const response = await PUT_RETURN(request, { params: { id: "1" } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe('returned');
    });
  });
});
