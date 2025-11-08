// Trace: SPEC-auth-email-password-1, REQ-FE-003
// API Client for Cloudflare Workers backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const AUTH_STORAGE_KEY = 'cheongram_auth_token';

export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    userMessage: string;
    timestamp: string;
    details?: any;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add JWT token from localStorage if available
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    // Add dev header in development (fallback for local testing)
    if (import.meta.env.DEV && !token) {
      (headers as Record<string, string>)['X-Dev-User-Email'] = 'kangdongouk@gmail.com';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401 && endpoint !== '/api/auth/login') {
          // Clear invalid/expired token
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem('cheongram_auth_email');

          // Show user-friendly message for token expiration
          const errorData = data as ApiError;
          const isTokenExpired = errorData.error?.code === 'UNAUTHORIZED' ||
                                 errorData.error?.message?.includes('expired');

          if (isTokenExpired) {
            console.warn('Session expired, redirecting to login');
          }

          // Redirect to login page
          window.location.href = '/login';
        }

        throw data as ApiError;
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if ((error as ApiError).error) {
        throw error;
      }

      // Handle network errors more specifically
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      let userMessage = '네트워크 오류가 발생했습니다';

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
        userMessage = '요청이 차단되었습니다. 광고 차단기나 브라우저 확장 프로그램을 확인해주세요.';
      }

      throw {
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
          userMessage,
          timestamp: new Date().toISOString(),
        },
      } as ApiError;
    }
  }

  // Games API
  async listGames(params?: {
    query?: string;
    minPlayers?: number;
    maxPlayers?: number;
    complexity?: string;
    availability?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }

    return this.request<any[]>(`/api/games?${searchParams.toString()}`);
  }

  async getGame(id: number) {
    return this.request<any>(`/api/games/${id}`);
  }

  async createGame(data: any) {
    return this.request<any>('/api/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGame(id: number, data: any) {
    return this.request<any>(`/api/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGame(id: number) {
    return this.request<void>(`/api/games/${id}`, {
      method: 'DELETE',
    });
  }

  // Rentals API
  async listRentals(params?: {
    gameId?: number;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }

    return this.request<any[]>(`/api/rentals?${searchParams.toString()}`);
  }

  async getRental(id: number) {
    return this.request<any>(`/api/rentals/${id}`);
  }

  async createRental(data: any) {
    return this.request<any>('/api/rentals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRental(id: number, data: any) {
    return this.request<any>(`/api/rentals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRental(id: number) {
    return this.request<void>(`/api/rentals/${id}`, {
      method: 'DELETE',
    });
  }

  async returnRental(id: number) {
    return this.request<any>(`/api/rentals/${id}/return`, {
      method: 'POST',
    });
  }

  async extendRental(id: number, newDueDate: string) {
    return this.request<any>(`/api/rentals/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ new_due_date: newDueDate }),
    });
  }

  // Scraper API
  async scrapeGameInfo(url: string) {
    return this.request<any>('/api/scrape', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // Auth API
  async login(email: string, password: string) {
    return this.request<{ token: string; email: string; expiresIn: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
