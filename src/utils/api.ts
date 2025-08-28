import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API响应接口
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 用户信息接口
interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginAttempts: number;
  lockedUntil?: string;
  isLocked?: boolean;
}

// 登录请求接口
interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应接口
interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Token存储管理
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  static setTokens(accessToken: string, refreshToken: string): void {
    this.setAccessToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }
}

// API客户端类
class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(baseURL: string = 'http://localhost:3001/api') {
    this.instance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 请求拦截器 - 添加认证头
    this.instance.interceptors.request.use(
      (config) => {
        const token = TokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理token刷新
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // 如果正在刷新token，将请求加入队列
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return this.instance(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = TokenManager.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.instance.post('/auth/refresh', {
              refreshToken
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            TokenManager.setTokens(accessToken, newRefreshToken);

            // 处理队列中的请求
            this.failedQueue.forEach(({ resolve }) => {
              resolve();
            });
            this.failedQueue = [];

            return this.instance(originalRequest);
          } catch (refreshError) {
            // 刷新失败，清除token并跳转到登录页
            TokenManager.clearTokens();
            this.failedQueue.forEach(({ reject }) => {
              reject(refreshError);
            });
            this.failedQueue = [];
            
            // 触发登录页面跳转
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // 通用请求方法
  private async request<T = unknown>(
    config: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance(config);
      return response.data;
    } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error && (error as { response?: { data?: unknown } }).response?.data) {
      return (error as { response: { data: unknown } }).response.data as ApiResponse<T>;
    }
    return {
      success: false,
      error: (error as Error)?.message || '网络请求失败'
    };
    }
  }

  // GET请求
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  // POST请求
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  // PUT请求
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  // DELETE请求
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // 文件上传
  async upload<T = unknown>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }
}

// 创建API客户端实例
const apiClient = new ApiClient();

// 认证相关API
export const authApi = {
  // 登录
  login: (credentials: { username: string; password: string }) => 
    apiClient.post('/auth/login', { username: credentials.username, password: credentials.password }),
  
  // 刷新token
  refreshToken: () => apiClient.post('/auth/refresh'),
  
  // 登出
  logout: () => apiClient.post('/auth/logout'),
  
  // 获取当前用户信息
  getCurrentUser: () => apiClient.get('/auth/me'),
  
  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }) => 
    apiClient.post('/auth/change-password', data),
};

// 用户管理API
export const userApi = {
  // 获取用户列表
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => 
    apiClient.get<{
      users: User[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/users', { params }),
  
  // 获取用户详情
  getUser: (id: string) => 
    apiClient.get<User>(`/users/${id}`),
  
  // 创建用户
  createUser: (data: Partial<User> & { password: string }) => 
    apiClient.post<User>('/users', data),
  
  // 更新用户
  updateUser: (id: string, data: Partial<User>) => 
    apiClient.put<User>(`/users/${id}`, data),
  
  // 删除用户
  deleteUser: (id: string) => 
    apiClient.delete(`/users/${id}`),
  
  // 解锁用户
  unlockUser: (id: string) => 
    apiClient.post(`/users/${id}/unlock`),
  
  // 获取用户统计
  getUserStats: () => 
    apiClient.get('/users/stats'),
};

// 文件管理API
export const fileApi = {
  // 上传文件
  uploadFile: (file: File, onProgress?: (progress: number) => void) => 
    apiClient.upload('/files/upload', file, onProgress),
  
  // 获取文件列表
  getFiles: (params?: { page?: number; limit?: number; search?: string; type?: string }) => 
    apiClient.get('/files', { params }),
  
  // 获取文件详情
  getFile: (id: string) => 
    apiClient.get(`/files/${id}`),
  
  // 下载文件
  downloadFile: (id: string) => {
    const token = TokenManager.getAccessToken();
    const url = `http://localhost:3001/api/files/${id}/download`;
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  // 更新文件信息
  updateFile: (id: string, data: { name?: string; description?: string }) => 
    apiClient.put(`/files/${id}`, data),
  
  // 删除文件
  deleteFile: (id: string) => 
    apiClient.delete(`/files/${id}`),
  
  // 批量删除文件
  deleteFiles: (ids: string[]) => 
    apiClient.post('/files/batch-delete', { ids }),
  
  // 获取文件统计
  getFileStats: () => 
    apiClient.get('/files/stats'),
};

// 系统管理API
export const systemApi = {
  // 获取系统状态
  getSystemStatus: () => 
    apiClient.get('/system/status'),
  
  // 获取系统指标
  getSystemMetrics: (timeRange?: string) => 
    apiClient.get('/system/metrics', { params: { timeRange } }),
  
  // 获取操作日志
  getOperationLogs: (params?: { page?: number; limit?: number; operation?: string; userId?: string; startDate?: string; endDate?: string }) => 
    apiClient.get('/system/logs', { params }),
  
  // 获取磁盘使用情况
  getDiskUsage: () => 
    apiClient.get('/system/disk'),
  
  // 系统健康检查
  healthCheck: () => 
    apiClient.get('/system/health'),
};

export { TokenManager, apiClient };
export type { User, LoginRequest, LoginResponse, ApiResponse };