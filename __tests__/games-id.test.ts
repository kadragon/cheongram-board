import { createRouteHandlerClient } from "@supabase/ssr";
import { GET, PUT, DELETE } from "@/app/api/games/[id]/route";

// Mock Supabase
jest.mock("@supabase/ssr", () => ({
  createRouteHandlerClient: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
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

describe("Game Management API (/api/games/[id])", () => {
  const params = { id: "1" };

  describe("GET", () => {
    it("should return a single game", async () => {
      const mockGame = { id: 1, name: "Game 1" };
      // Setup correct chaining
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({ data: mockGame, error: null });

      const response = await GET(new Request(`http://localhost/api/games/1`), {
        params,
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockGame);
      expect(mockSupabase.from).toHaveBeenCalledWith("games");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "1");
    });
  });

  describe("PUT", () => {
    it("should update a game if user is authenticated", async () => {
      const updatedGame = { name: "Updated Game" };
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: "user-123" } } },
      });
      // Setup correct chaining
      mockSupabase.from.mockReturnThis();
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 1, ...updatedGame },
        error: null,
      });

      const request = new Request("http://localhost/api/games/1", {
        method: "PUT",
        body: JSON.stringify(updatedGame),
      });

      const response = await PUT(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ id: 1, ...updatedGame });
      expect(mockSupabase.update).toHaveBeenCalledWith(updatedGame);
    });
  });

  describe("DELETE", () => {
    it("should delete a game if user is authenticated", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: "user-123" } } },
      });
      // Setup correct chaining
      mockSupabase.from.mockReturnThis();
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      const request = new Request("http://localhost/api/games/1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { params });

      expect(response.status).toBe(204);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });
  });
});
