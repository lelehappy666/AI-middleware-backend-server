import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { userApi, type User } from '../utils/api';

export interface CreateUserData {
  name: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

export interface UpdateUserData {
  name?: string;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  isActive?: boolean;
}

export { type User }

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'USER'>('ALL');

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getUsers();
      if (response.success && response.data) {
        setUsers(response.data.users || []);
      } else {
        throw new Error(response.error || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建用户
  const createUser = async (userData: CreateUserData): Promise<boolean> => {
    try {
      const response = await userApi.createUser(userData);
      if (response.success) {
        toast.success('用户创建成功');
        await fetchUsers(); // 刷新用户列表
        return true;
      } else {
        throw new Error(response.error || '创建用户失败');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      toast.error(error instanceof Error ? error.message : '创建用户失败');
      return false;
    }
  };

  // 更新用户
  const updateUser = async (userId: string, userData: UpdateUserData): Promise<boolean> => {
    try {
      const response = await userApi.updateUser(userId, userData);
      if (response.success) {
        toast.success('用户更新成功');
        await fetchUsers(); // 刷新用户列表
        return true;
      } else {
        throw new Error(response.error || '更新用户失败');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      toast.error(error instanceof Error ? error.message : '更新用户失败');
      return false;
    }
  };

  // 删除用户
  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await userApi.deleteUser(userId);
      if (response.success) {
        toast.success('用户删除成功');
        await fetchUsers(); // 刷新用户列表
        return true;
      } else {
        throw new Error(response.error || '删除用户失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      toast.error(error instanceof Error ? error.message : '删除用户失败');
      return false;
    }
  };

  // 筛选用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users: filteredUsers,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  };
};