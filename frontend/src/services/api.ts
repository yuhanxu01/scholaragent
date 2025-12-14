import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { AuthTokens } from '../types';
import { toast } from 'react-hot-toast';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('API: Received 401, attempting token refresh');

          // If we're already refreshing, queue this request
          if (this.isRefreshing) {
            console.log('API: Token refresh in progress, queuing request');
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              console.log('API: Attempting token refresh');
              const response = await this.refreshToken(refreshToken);
              const { access } = response;
              this.setAccessToken(access);

              console.log('API: Token refresh successful');
              this.processQueue(null, access);
              originalRequest.headers.Authorization = `Bearer ${access}`;
              return this.client(originalRequest);
            } else {
              console.log('API: No refresh token available');
              throw new Error('No refresh token');
            }
          } catch (refreshError) {
            console.error('API: Token refresh failed:', refreshError);
            this.processQueue(refreshError, null);
            // Clear authentication state and trigger auth check
            this.logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // For other 401/403 errors, clear auth state
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.warn(`API: Received ${error.response.status}, checking auth status`);
          // Only logout if this wasn't already a retry request
          if (!originalRequest._retry) {
            const hasToken = !!this.getAccessToken();
            if (hasToken) {
              console.log('API: Invalid token detected, clearing authentication');
              this.logout();
            }
          }
        }

        // Handle other errors
        this.handleError(error);

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private handleError(error: any) {
    const { response } = error;

    if (!response) {
      toast.error('网络错误，请检查网络连接');
      return;
    }

    const errorData = response.data?.error || {};
    const message = errorData.message || '请求失败';

    switch (response.status) {
      case 400:
        toast.error(message);
        break;
      case 401:
        toast.error('登录已过期，请重新登录');
        // Don't force redirect here - let the auth state and routing handle it
        // window.location.href = '/login';
        break;
      case 403:
        toast.error('您没有权限执行此操作');
        break;
      case 404:
        toast.error('请求的资源不存在');
        break;
      case 429:
        toast.error('请求过于频繁，请稍后再试');
        break;
      case 500:
        toast.error('服务器错误，请稍后重试');
        break;
      case 503:
        toast.error('服务暂时不可用，请稍后重试');
        break;
      default:
        toast.error(message);
    }
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setAccessToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  private setRefreshToken(token: string) {
    localStorage.setItem('refresh_token', token);
  }

  public setTokens(tokens: AuthTokens) {
    this.setAccessToken(tokens.access);
    this.setRefreshToken(tokens.refresh);
  }

  public logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Don't force redirect here - let the auth state and routing handle it
    // window.location.href = '/login';
  }

  public getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }

  // 直接访问axios客户端，用于特殊情况
  public get rawClient() {
    return this.client;
  }

  // Auth endpoints
  public login(credentials: { email: string; password: string }) {
    return this.client.post('/auth/login/', credentials).then(response => response.data);
  }

  public register(data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) {
    return this.client.post('/auth/register/', data).then(response => response.data);
  }

  public refreshToken(refreshToken: string) {
    return this.client.post('/auth/token/refresh/', { refresh: refreshToken }).then(response => response.data);
  }

  public getCurrentUser() {
    return this.client.get('/auth/me/');
  }

  public getUserStats() {
    return this.client.get('/auth/stats/');
  }

  // Study session management
  public startStudySession(sessionType: string = 'review') {
    return this.client.post('/knowledge/study-sessions/start/', {
      session_type: sessionType
    });
  }

  public endStudySession(sessionId: string, data: {
    cards_studied: number;
    correct_answers: number;
  }) {
    return this.client.post(`/knowledge/study-sessions/${sessionId}/end/`, data);
  }

  public getStudyStatistics(days: number = 30) {
    return this.client.get('/knowledge/study-sessions/recent/', {
      params: { days }
    });
  }

  // Generic request methods
  public get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get(url, config).then(response => response.data);
  }

  public post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post(url, data, config).then(response => response.data);
  }

  public put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put(url, data, config).then(response => response.data);
  }

  public patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch(url, data, config).then(response => response.data);
  }

  public delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete(url, config).then(response => response.data);
  }
}

export const apiService = new ApiService();
export default apiService;

// 导出 api 实例供其他模块使用
export const api = apiService;
