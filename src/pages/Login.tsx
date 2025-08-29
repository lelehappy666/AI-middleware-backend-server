import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';

interface LoginFormData {
  username: string;
  password: string;
}

interface LoginFormErrors {
  username?: string;
  password?: string;
  general?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    username: localStorage.getItem('rememberedUsername') || '',
    password: ''
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    const remembered = localStorage.getItem('rememberedUsername');
    return remembered !== null && remembered !== '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  // 如果已经登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 清除错误信息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // 同步记住用户名状态（简化逻辑）
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedUsername');
    const hasRemembered = remembered !== null && remembered !== '';
    setRememberMe(hasRemembered);
  }, []);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (formData.username.length < 3) {
      newErrors.username = '用户名至少3个字符';
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少6个字符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 如果是用户名字段且记住用户名已选中，立即更新localStorage
    if (field === 'username' && rememberMe) {
      if (value.trim()) {
        localStorage.setItem('rememberedUsername', value.trim());
      } else {
        localStorage.removeItem('rememberedUsername');
      }
    }
    
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 处理记住用户名复选框变化
  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    
    if (checked && formData.username.trim()) {
      // 选中且有用户名时，立即保存到localStorage
      localStorage.setItem('rememberedUsername', formData.username.trim());
    } else {
      // 取消选中时，立即从localStorage删除
      localStorage.removeItem('rememberedUsername');
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // 清除之前的错误
    clearError();
    setIsSubmitting(true);
    
    try {
      const success = await login({
        username: formData.username,
        password: formData.password
      });
      
      if (success) {
        // 处理记住用户名功能
        if (rememberMe) {
          localStorage.setItem('rememberedUsername', formData.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }
        
        // 登录成功，显示成功动画后跳转
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      }
      // 如果success为false，错误信息已经在authStore中设置了
    } catch (err) {
      console.error('Login error:', err);
      // 这里可以设置额外的错误处理，但通常authStore已经处理了
    } finally {
      setIsSubmitting(false);
    }
  };

  // 动画变体
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
      </div>

      {/* 登录卡片 */}
      <motion.div
        className="relative w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* 卡片背景 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          {/* Logo和标题 */}
          <motion.div
            className="text-center mb-8"
            variants={logoVariants}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              AI中台管理系统
            </h1>
            <p className="text-gray-600 text-sm">
              请登录您的账户以继续
            </p>
          </motion.div>

          {/* 错误提示 */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants}>
              <Input
                label="用户名"
                type="text"
                value={formData.username}
                onChange={handleInputChange('username')}
                error={errors.username}
                leftIcon={<User className="w-5 h-5" />}
                placeholder="请输入用户名"
                disabled={isLoading || isSubmitting}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                label="密码"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                error={errors.password}
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
                placeholder="请输入密码"
                disabled={isLoading || isSubmitting}
              />
            </motion.div>

            {/* 记住我 */}
            <motion.div
              className="flex items-center justify-between"
              variants={itemVariants}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={isLoading || isSubmitting}
                />
                <span className="text-sm text-gray-600">记住用户名</span>
              </label>
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                disabled={isLoading || isSubmitting}
              >
                忘记密码？
              </button>
            </motion.div>

            {/* 登录按钮 */}
            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isLoading || isSubmitting}
                disabled={isLoading || isSubmitting}
              >
                {isLoading || isSubmitting ? '登录中...' : '登录'}
              </Button>
            </motion.div>
          </form>

          {/* 底部信息 */}
          <motion.div
            className="mt-8 text-center"
            variants={itemVariants}
          >
            <p className="text-xs text-gray-500">© 2025 AI中台管理系统. 保留所有权利.</p>
          </motion.div>
        </div>

        {/* 成功状态覆盖层 */}
        <AnimatePresence>
          {isAuthenticated && (
            <motion.div
              className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <motion.div
                  className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  登录成功！
                </h3>
                <p className="text-gray-600 text-sm">
                  正在跳转到仪表板...
                </p>
                <div className="mt-4">
                  <Loading size="sm" variant="spinner" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;