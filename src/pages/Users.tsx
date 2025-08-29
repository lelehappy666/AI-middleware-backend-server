import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users as UsersIcon, Plus, Search, Filter, Edit, Trash2, Shield, User, CheckCircle, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useUsers, User as UserType, CreateUserData, UpdateUserData } from '../hooks/useUsers';
import { usePermissions } from "../store/authStore";
import { userApi } from '../utils/api';
import UserModal from '../components/UserModal';
// import { toast } from 'sonner'; // 暂时注释掉未使用的导入
import { useNotifications } from '../hooks/useNotifications';

const Users: React.FC = () => {
  const {
    users,
    loading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    createUser,
    updateUser,
    deleteUser,
    fetchUsers
  } = useUsers();

  const { isSuperAdmin } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);
  
  // SSE通知监听
  const { notifications } = useNotifications();

  // 自动刷新功能 - 组件挂载时自动获取最新数据
  useEffect(() => {
    // 组件挂载时自动刷新一次
    handleRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // 监听SSE通知，实时更新用户列表
  useEffect(() => {
    const latestNotification = notifications[0];
    if (!latestNotification) return;
    
    // 监听用户创建和删除通知
    if (latestNotification.type === 'user_created' || latestNotification.type === 'user_deleted') {
      // 刷新用户列表以保持同步
      fetchUsers();
    }
  }, [notifications, fetchUsers]);

  // 手动刷新功能，带防连点机制
  const handleRefresh = useCallback(async () => {
    const now = Date.now();
    // 防连点机制：2秒内不允许重复刷新
    if (now - lastRefreshTime < 2000) {
      return;
    }
    
    setRefreshing(true);
    setLastRefreshTime(now);
    
    try {
      await fetchUsers();
      // 清除所有密码缓存，确保显示最新数据
      setUserPasswords({});
      setVisiblePasswords({});
    } catch (error) {
      console.error('刷新用户列表失败:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsers, lastRefreshTime]);

  // 获取用户密码
  const fetchUserPassword = async (userId: string) => {
    if (!isSuperAdmin) return;
    
    // 设置加载状态
    setLoadingPasswords(prev => ({ ...prev, [userId]: true }));
    
    try {
      const response = await userApi.getUserPassword(userId);
      if (response.success && response.data) {
        setUserPasswords(prev => ({
          ...prev,
          [userId]: response.data.password
        }));
      } else {
        console.error('获取密码失败:', response.error);
        // 显示错误信息给用户
        setUserPasswords(prev => ({
          ...prev,
          [userId]: '获取失败'
        }));
      }
    } catch (error) {
      console.error('获取密码失败:', error);
      // 显示错误信息给用户
      setUserPasswords(prev => ({
        ...prev,
        [userId]: '获取失败'
      }));
    } finally {
      // 清除加载状态
      setLoadingPasswords(prev => ({ ...prev, [userId]: false }));
    }
  };

  // 切换密码显示状态
  const togglePasswordVisibility = async (userId: string) => {
    if (!visiblePasswords[userId] && !userPasswords[userId]) {
      await fetchUserPassword(userId);
    }
    
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCreateUser = () => {
    if (!isSuperAdmin) {
      alert('只有超级管理员才能添加用户');
      return;
    }
    setModalMode('create');
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEditUser = (user: UserType) => {
    if (!isSuperAdmin) {
      alert('只有超级管理员才能编辑用户');
      return;
    }
    setModalMode('edit');
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleDeleteUser = async (user: UserType) => {
    if (!isSuperAdmin) {
      alert('只有超级管理员才能删除用户');
      return;
    }
    if (window.confirm(`确定要删除用户 "${user.name}" 吗？此操作不可撤销。`)) {
      await deleteUser(user.id);
    }
  };

  const handleModalSubmit = async (data: CreateUserData | UpdateUserData): Promise<boolean> => {
    if (modalMode === 'create') {
      return await createUser(data as CreateUserData);
    } else {
      const success = await updateUser(selectedUser!.id, data as UpdateUserData);
      if (success) {
        // 清除更新用户的密码缓存，确保显示最新密码
        setUserPasswords(prev => {
          const newPasswords = { ...prev };
          delete newPasswords[selectedUser!.id];
          return newPasswords;
        });
        setVisiblePasswords(prev => ({
          ...prev,
          [selectedUser!.id]: false
        }));
      }
      return success;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
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

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 页面标题和操作 */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            用户管理
          </h2>
          <p className="text-gray-600">
            管理系统用户，包括创建、编辑和权限设置。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 刷新按钮 */}
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '刷新中...' : '刷新'}
          </Button>
          {isSuperAdmin && (
            <Button 
              variant="primary" 
              className="flex items-center gap-2"
              onClick={handleCreateUser}
            >
              <Plus className="w-4 h-4" />
              添加用户
            </Button>
          )}
        </div>
      </motion.div>

      {/* 搜索和筛选 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索用户..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Button 
                  ref={filterButtonRef}
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <Filter className="w-4 h-4" />
                  筛选
                </Button>
                {createPortal(
                   <AnimatePresence>
                     {filterOpen && (
                       <>
                         {/* 全屏遮罩层 */}
                         <motion.div 
                           className="fixed inset-0 bg-black/20 z-[999998]" 
                           onClick={() => setFilterOpen(false)}
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           transition={{ duration: 0.2 }}
                         />
                         
                         {/* 筛选菜单 */}
                         <motion.div
                           className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[999999]"
                           style={{
                             top: filterButtonRef.current ? filterButtonRef.current.getBoundingClientRect().bottom + 8 : 0,
                             right: filterButtonRef.current ? window.innerWidth - filterButtonRef.current.getBoundingClientRect().right : 0,
                             width: '160px'
                           }}
                           initial={{ opacity: 0, y: -10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.2 }}
                         >
                      <button
                        onClick={() => {
                          setRoleFilter('ALL');
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          roleFilter === 'ALL' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        全部用户
                      </button>
                      <button
                        onClick={() => {
                          setRoleFilter('ADMIN');
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          roleFilter === 'ADMIN' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        管理员
                      </button>
                      <button
                        onClick={() => {
                          setRoleFilter('SUPER_ADMIN');
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          roleFilter === 'SUPER_ADMIN' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        超级管理员
                      </button>
                      <button
                        onClick={() => {
                          setRoleFilter('USER');
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          roleFilter === 'USER' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        普通用户
                      </button>
                    </motion.div>
                       </>
                     )}
                   </AnimatePresence>,
                   document.body
                 )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 用户列表 */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              用户列表 ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || roleFilter !== 'ALL' ? '未找到匹配的用户' : '暂无用户'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm || roleFilter !== 'ALL' ? '请尝试调整搜索条件' : '点击上方按钮添加第一个用户'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">用户</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">角色</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">状态</th>
                      {isSuperAdmin && (
                        <th className="text-left py-3 px-4 font-medium text-gray-700">密码</th>
                      )}
                      <th className="text-left py-3 px-4 font-medium text-gray-700">创建时间</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">最后登录</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'SUPER_ADMIN'
                              ? 'bg-red-100 text-red-700'
                              : user.role === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role === 'SUPER_ADMIN' ? <Shield className="w-3 h-3" /> : user.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {user.role === 'SUPER_ADMIN' ? '超级管理员' : user.role === 'ADMIN' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {user.isActive ? '启用' : '禁用'}
                          </span>
                        </td>
                        {isSuperAdmin && (
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 font-mono">
                                {visiblePasswords[user.id] 
                                  ? (loadingPasswords[user.id] 
                                      ? '加载中...' 
                                      : (userPasswords[user.id] || '••••••••')
                                    )
                                  : '••••••••'
                                }
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="p-1 h-6 w-6"
                              >
                                {visiblePasswords[user.id] ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          从未登录
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {isSuperAdmin ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="p-2"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">无权限</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 用户模态框 */}
      <UserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        user={selectedUser}
        mode={modalMode}
      />
    </motion.div>
  );
};

export default Users;