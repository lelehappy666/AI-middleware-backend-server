import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../utils/api';
import { TokenManager } from '../utils/api';
import type { User, LoginRequest, ApiResponse, LoginResponse } from '../utils/api';

interface AuthState {
  // 状态
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 操作
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials) as ApiResponse<LoginResponse>;
          
          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            
            // 保存tokens
            TokenManager.setTokens(accessToken, refreshToken);
            
            // 更新状态
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            
            return true;
          } else {
            set({
              isLoading: false,
              error: response.error || response.message || '登录失败'
            });
            return false;
          }
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: (error as Error).message || '网络错误，请稍后重试'
          });
          return false;
        }
      },

      // 登出
      logout: async () => {
        set({ isLoading: true });
        
        try {
          // 调用登出API
          await authApi.logout();
        } catch (error) {
          // 即使API调用失败，也要清除本地状态
          console.error('Logout API failed:', error);
        } finally {
          // 清除tokens和状态
          TokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      // 获取当前用户信息
      getCurrentUser: async () => {
        const token = TokenManager.getAccessToken();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        
        try {
          const response = await authApi.getCurrentUser() as ApiResponse<User>;
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            // Token可能已过期或无效
            TokenManager.clearTokens();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
          }
        } catch (error: unknown) {
          // 网络错误或其他错误
          TokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: (error as Error).message || '获取用户信息失败'
          });
        }
      },

      // 修改密码
      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.changePassword({
            oldPassword: currentPassword,
            newPassword
          });
          
          if (response.success) {
            set({ isLoading: false });
            return true;
          } else {
            set({
              isLoading: false,
              error: response.error || response.message || '密码修改失败'
            });
            return false;
          }
        } catch (error: unknown) {
          set({
            isLoading: false,
            error: (error as Error).message || '网络错误，请稍后重试'
          });
          return false;
        }
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'auth-storage',
      // 只持久化用户信息和认证状态，不持久化loading和error
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      // 在hydration时检查token是否仍然有效
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated) {
          // 异步验证token有效性
          setTimeout(() => {
            state.getCurrentUser();
          }, 100);
        }
      }
    }
  )
);

// 权限检查hooks
export const usePermissions = () => {
  const { user } = useAuthStore();
  
  return {
    // 是否为超级管理员
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    
    // 是否为管理员（包括超级管理员）
    isAdmin: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    
    // 是否为普通用户
    isUser: user?.role === 'USER',
    
    // 检查是否有特定权限
    hasRole: (role: 'SUPER_ADMIN' | 'ADMIN' | 'USER') => user?.role === role,
    
    // 检查是否有管理员级别权限
    hasAdminAccess: () => user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    
    // 检查用户状态
    isActive: user?.isActive || false,
    isLocked: user?.isLocked || false,
    isInactive: !(user?.isActive || false)
  };
};

// 认证守卫hook
export const useAuthGuard = () => {
  const { isAuthenticated, isLoading, getCurrentUser } = useAuthStore();
  
  React.useEffect(() => {
    // 如果没有认证且不在加载中，尝试获取用户信息
    if (!isAuthenticated && !isLoading) {
      const token = TokenManager.getAccessToken();
      if (token) {
        getCurrentUser();
      }
    }
  }, [isAuthenticated, isLoading, getCurrentUser]);
  
  return { isAuthenticated, isLoading };
};