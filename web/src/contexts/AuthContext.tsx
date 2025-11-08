// Trace: SPEC-auth-email-password-1, REQ-FE-002

/**
 * Authentication Context
 *
 * Manages authentication state and provides login/logout functionality.
 * Stores JWT token in localStorage for persistence.
 * Validates token expiration on load and before usage.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, email: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'cheongram_auth_token';
const EMAIL_STORAGE_KEY = 'cheongram_auth_email';

interface JWTPayload {
  email: string;
  exp: number;
  iat: number;
}

/**
 * Check if JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired or will expire in the next 5 minutes
    // This provides a buffer for token refresh
    const expirationBuffer = 5 * 60; // 5 minutes in seconds
    return decoded.exp < (currentTime + expirationBuffer);
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return true; // Treat invalid tokens as expired
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    email: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const token = localStorage.getItem(AUTH_STORAGE_KEY);
        const email = localStorage.getItem(EMAIL_STORAGE_KEY);

        if (token && email) {
          // Verify token hasn't expired
          if (isTokenExpired(token)) {
            console.warn('Stored token has expired, clearing auth state');
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(EMAIL_STORAGE_KEY);
          } else {
            setAuthState({
              token,
              email,
              isAuthenticated: true,
            });
          }
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = (token: string, email: string) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      localStorage.setItem(EMAIL_STORAGE_KEY, email);

      setAuthState({
        token,
        email,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(EMAIL_STORAGE_KEY);

      setAuthState({
        token: null,
        email: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Failed to clear auth state:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
