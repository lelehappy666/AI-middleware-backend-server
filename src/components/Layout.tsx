import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Files,
  Settings,
  Users,
  User,
  LogOut,
  Menu,
  Bell,
  Search,
  ChevronDown,
  Activity
} from 'lucide-react';
import { useAuthStore, usePermissions } from '../store/authStore';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import Notification from './ui/Notification';
import { useNotifications } from '../hooks/useNotifications';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  requiredRole?: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuthStore();
  const { hasAdminAccess } = usePermissions();
  const { notifications, isConnected, removeNotification, clearAllNotifications } = useNotifications();

  // 导航菜单项
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: '仪表板',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/dashboard'
    },
    {
      id: 'users',
      label: '用户管理',
      icon: <Users className="w-5 h-5" />,
      path: '/users',
      requiredRole: 'SUPER_ADMIN'
    },
    {
      id: 'files',
      label: '文件管理',
      icon: <Files className="w-5 h-5" />,
      path: '/files'
    },
    {
      id: 'settings',
      label: '系统设置',
      icon: <Settings className="w-5 h-5" />,
      path: '/settings',
      requiredRole: 'ADMIN'
    },
    {
      id: 'test-sse',
      label: 'SSE测试',
      icon: <Activity className="w-5 h-5" />,
      path: '/test-sse'
    },
    {
      id: 'token-debug',
      label: 'Token调试',
      icon: <Settings className="w-5 h-5" />,
      path: '/token-debug'
    }
  ];

  // 过滤导航项（根据权限）
  const filteredNavigationItems = navigationItems.filter(item => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === 'ADMIN') return hasAdminAccess();
    return user?.role === item.requiredRole;
  });

  // 处理导航点击
  const handleNavigation = (path: string) => {
    navigate(path);
    // 在移动端关闭侧边栏
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // 处理登出
  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    const currentItem = navigationItems.find(item => item.path === location.pathname);
    return currentItem?.label || '仪表板';
  };

  // 侧边栏动画变体
  const sidebarVariants = {
    open: {
      width: 280,
      transition: {
        duration: 0.3
      }
    },
    closed: {
      width: 80,
      transition: {
        duration: 0.3
      }
    }
  };

  const contentVariants = {
    open: {
      marginLeft: 280,
      transition: {
        duration: 0.3
      }
    },
    closed: {
      marginLeft: 80,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <motion.div
        className="fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-30 flex flex-col"
        variants={sidebarVariants}
        animate={sidebarOpen ? 'open' : 'closed'}
        initial={false}
      >
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">AI中台</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`flex-shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {item.icon}
                </div>
                
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      className="font-medium text-sm"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        {/* 用户信息区域 */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    className="flex-1 text-left"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user?.name || '用户'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.role === 'SUPER_ADMIN' ? '超级管理员' : 
                       user?.role === 'ADMIN' ? '管理员' : '用户'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {sidebarOpen && (
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {/* 用户菜单下拉 */}
            <AnimatePresence>
              {showUserMenu && sidebarOpen && (
                <motion.div
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <button
                    onClick={() => {
                      handleNavigation('/profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    个人中心
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 主内容区域 */}
      <motion.div
        className="min-h-screen"
        variants={contentVariants}
        animate={sidebarOpen ? 'open' : 'closed'}
        initial={false}
      >
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {getCurrentPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* 搜索框 */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 通知按钮 */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              )}
              {!isConnected && (
                <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-6">
          <Outlet />
        </main>
      </motion.div>

      {/* 移动端遮罩 */}
      <AnimatePresence>
        {sidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 登出确认弹窗 */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="确认退出"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            您确定要退出登录吗？
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              loading={isLoading}
            >
              退出登录
            </Button>
          </div>
        </div>
      </Modal>

      {/* 通知组件 */}
      <Notification
        notifications={notifications}
        onRemove={removeNotification}
        onClearAll={clearAllNotifications}
      />
    </div>
  );
};

export default Layout;