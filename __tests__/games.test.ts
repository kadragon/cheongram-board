import { createServerClient } from "@supabase/ssr";
import { GET, POST } from "@/app/api/games/route";
import { NextResponse } from "next/server";

// Mock Supabase
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn(),
  insert: jest.fn(),
  auth: {
    getSession: jest.fn(),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
});

describe("Game Management API (/api/games)", () => {
  describe("GET", () => {
    it("should return a list of games", async () => {
      const mockGames = [{ id: 1, name: "Game 1" }];
      mockSupabase.select.mockResolvedValueOnce({
        data: mockGames,
        error: null,
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual(mockGames);
      expect(mockSupabase.from).toHaveBeenCalledWith("games");
    });

    it("should return 500 on error", async () => {
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: "DB Error" },
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe("DB Error");
    });
  });

  describe("POST", () => {
    it("should create a new game if user is authenticated", async () => {
      const newGame = { name: "New Game" };
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { user: { id: "user-123" } } },
      });
      mockSupabase.insert.mockReturnThis();
      mockSupabase.select.mockResolvedValueOnce({
        data: [{ id: 2, ...newGame }],
        error: null,
      });

      const request = new Request("http://localhost/api/games", {
        method: "POST",
        body: JSON.stringify(newGame),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual([{ id: 2, ...newGame }]);
      expect(mockSupabase.insert).toHaveBeenCalledWith(newGame);
    });

    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const request = new Request("http://localhost/api/games", {
        method: "POST",
        body: JSON.stringify({ name: "New Game" }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Unauthorized");
    });
  });
});
