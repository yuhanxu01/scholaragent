import axios, { type AxiosResponse } from 'axios';

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 创建axios实例
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 如果数据是 FormData，删除 Content-Type 让浏览器自动设置
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理token过期
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/auth/token/refresh/`,
            { refresh: refreshToken }
          );
          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // 重试原始请求
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } else {
          // 没有refresh token，跳转登录
          throw new Error('No refresh token');
        }
      } catch (refreshError) {
        // 刷新失败，清除token并跳转登录
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// 通用API响应接口
export interface ApiResponse<T> {
  data: T;
  message?: string;
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// 分页接口
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 错误接口
export interface ApiError {
  detail: string;
  error?: string;
  field_errors?: Record<string, string[]>;
}

// 通用API方法
export const api = {
  get: <T>(url: string, params?: Record<string, any>): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.get(url, { params });
  },

  post: <T>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.post(url, data);
  },

  put: <T>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.put(url, data);
  },

  patch: <T>(url: string, data?: any): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.patch(url, data);
  },

  delete: <T>(url: string): Promise<AxiosResponse<ApiResponse<T>>> => {
    return apiClient.delete(url);
  },
};