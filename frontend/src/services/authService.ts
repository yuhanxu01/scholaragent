import apiService from './api';
import type { User, AuthTokens, LoginCredentials, RegisterData, AuthResponse } from '../types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post('/auth/login/', credentials);
      const { access, refresh, user } = response;

      const tokens: AuthTokens = { access, refresh };
      apiService.setTokens(tokens);

      // Use user info from login response (no need for separate API call)
      return { user, tokens };
    } catch (error: any) {
      let errorMessage = 'Login failed';

      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle different error types
        if (errorData.error) {
          // General error message from backend
          errorMessage = errorData.error;
        } else if (errorData.non_field_errors) {
          // Non-field errors (like invalid credentials)
          errorMessage = errorData.non_field_errors[0] || 'Invalid credentials';
        } else if (errorData.email) {
          // Email field errors
          errorMessage = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
        } else if (errorData.password) {
          // Password field errors
          errorMessage = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
        } else if (errorData.detail) {
          // DRF detail error
          errorMessage = errorData.detail;
        }
      } else if (error.message) {
        // Network or other errors
        if (error.message.includes('Network Error')) {
          errorMessage = '网络连接失败，请检查网络连接';
        } else if (error.message.includes('timeout')) {
          errorMessage = '请求超时，请稍后重试';
        } else {
          errorMessage = error.message;
        }
      }

      throw new Error(errorMessage);
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiService.post('/auth/register/', data);
      const { user, access, refresh } = response;

      const tokens: AuthTokens = { access, refresh };
      apiService.setTokens(tokens);

      return { user, tokens };
    } catch (error: any) {
      throw new Error(error.response?.data?.email || error.response?.data?.password || error.response?.data?.non_field_errors || 'Registration failed');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiService.get('/auth/me/');
      return response;
    } catch (error: any) {
      console.warn('getCurrentUser failed:', error);
      // If we get a 401 or 403, the token is invalid
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Token invalid, clearing authentication');
        this.logout();
      }
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      // No need to call logout endpoint, just clear tokens
      apiService.logout();
    } catch (error) {
      // Continue with logout even if server call fails
      apiService.logout();
    }
  }

  async refreshToken(): Promise<AuthTokens | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiService.post('/auth/token/refresh/', { refresh: refreshToken });
      const { access } = response;

      const newTokens = { access, refresh: refreshToken };
      localStorage.setItem('access_token', access);
      return newTokens;
    } catch (error) {
      apiService.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // Validate token by making a lightweight API call
  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/'}auth/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        return true;
      } else if (response.status === 401 || response.status === 403) {
        console.log('Token validation failed, clearing authentication');
        this.logout();
        return false;
      } else {
        // For other errors, assume token is still valid
        return true;
      }
    } catch (error) {
      console.warn('Token validation error:', error);
      // For network errors, assume token is still valid
      return true;
    }
  }

  // Check if token is expired (basic JWT decode)
  isTokenExpired(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch (error) {
      console.warn('Failed to decode token:', error);
      return true; // Assume expired if we can't decode
    }
  }

  async updateProfile(data: Partial<User> | FormData): Promise<User> {
    try {
      const response = await apiService.patch('/auth/profile/', data);
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update profile');
    }
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<void> {
    try {
      const response = await apiService.post('/auth/change-password/', data);

      // Clear local tokens since all tokens are invalidated on the server
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to change password');
    }
  }
}

export const authService = new AuthService();
export default authService;