import { createServerClient } from "@supabase/ssr";
import { POST } from "@/app/api/rentals/route";

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
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getSession: jest.fn(),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (createServerClient as jest.Mock).mockReturnValue(mockSupabase);
  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "user-123" } } },
  });
});

describe("POST /api/rentals", () => {
  it("should create a new rental if the game is available", async () => {
    const newRental = { renter_name: "John Doe", rental_date: "2025-07-13", game_id: 1 };
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // Game is available
    mockSupabase.select.mockResolvedValueOnce({ data: [{ id: 1, ...newRental }], error: null });

    const request = new Request("http://localhost/api/rentals", {
      method: "POST",
      body: JSON.stringify(newRental),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body[0]).toMatchObject({
        name: "John Doe",
        game_id: 1,
      });
  });

  it("should not create a new rental if the game is already rented", async () => {
    const newRental = { renter_name: "Jane Doe", rental_date: "2025-07-14", game_id: 1 };
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 1, game_id: 1, returned_at: null }, error: null }); // Game is not available

    const request = new Request("http://localhost/api/rentals", {
      method: "POST",
      body: JSON.stringify(newRental),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe("Game is not available for rent");
  });

  it("should return 400 if required fields are missing", async () => {
    const newRental = { renter_name: "John Doe" }; // Missing rental_date and game_id

    const request = new Request("http://localhost/api/rentals", {
        method: "POST",
        body: JSON.stringify(newRental),
      });
      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Missing required fields");
  });
});
