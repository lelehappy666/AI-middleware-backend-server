import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { User as UserType, CreateUserData, UpdateUserData } from '../hooks/useUsers';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<boolean>;
  user?: UserType | null;
  mode: 'create' | 'edit';
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  user,
  mode
}) => {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    role: 'USER' as 'SUPER_ADMIN' | 'ADMIN' | 'USER',
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        name: user.name,
        password: '',
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setFormData({
        name: '',
        password: '',
        role: 'USER',
        isActive: true
      });
    }
    setErrors({});
  }, [mode, user, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '用户名不能为空';
    } else if (formData.name.length < 2) {
      newErrors.name = '用户名至少2个字符';
    }

    if (mode === 'create' && !formData.password.trim()) {
      newErrors.password = '密码不能为空';
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = '密码长度至少8个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let submitData: CreateUserData | UpdateUserData;
      
      if (mode === 'create') {
        submitData = {
          name: formData.name,
          password: formData.password,
          role: formData.role
        };
      } else {
        submitData = {
          name: formData.name,
          role: formData.role,
          isActive: formData.isActive
        };
        // 只有在密码不为空时才包含密码
        if (formData.password.trim()) {
          (submitData as typeof submitData & { password: string }).password = formData.password;
        }
      }

      const success = await onSubmit(submitData);
      if (success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* 模态框 */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'create' ? '添加用户' : '编辑用户'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.name ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="请输入用户名"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'create' ? '密码' : '新密码（留空则不修改）'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.password ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder={mode === 'create' ? '请输入密码' : '留空则不修改密码'}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* 角色 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户角色
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value as 'SUPER_ADMIN' | 'ADMIN' | 'USER')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none bg-white"
                  >
                    <option value="USER">普通用户</option>
                    <option value="ADMIN">管理员</option>
                    <option value="SUPER_ADMIN">超级管理员</option>
                  </select>
                </div>
              </div>

              {/* 状态（仅编辑模式） */}
              {mode === 'edit' && (
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      启用用户
                    </span>
                  </label>
                </div>
              )}

              {/* 按钮 */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                >
                  {mode === 'create' ? '创建用户' : '保存修改'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UserModal;