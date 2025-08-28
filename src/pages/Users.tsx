import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, Plus, Search, Filter, Edit, Trash2, Shield, User, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useUsers, User as UserType, CreateUserData, UpdateUserData } from '../hooks/useUsers';
import { usePermissions } from "../store/authStore";
import UserModal from '../components/UserModal';
// import { toast } from 'sonner'; // 暂时注释掉未使用的导入

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
    deleteUser
  } = useUsers();

  const { isSuperAdmin } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

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
      return await updateUser(selectedUser!.id, data as UpdateUserData);
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
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <Filter className="w-4 h-4" />
                  筛选
                </Button>
                {filterOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-[120px]">
                    <div className="space-y-2">
                      <button
                        onClick={() => { setRoleFilter('ALL'); setFilterOpen(false); }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          roleFilter === 'ALL' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        全部用户
                      </button>
                      <button
                        onClick={() => { setRoleFilter('ADMIN'); setFilterOpen(false); }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          roleFilter === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        管理员
                      </button>
                      <button
                        onClick={() => { setRoleFilter('SUPER_ADMIN'); setFilterOpen(false); }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          roleFilter === 'SUPER_ADMIN' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        超级管理员
                      </button>
                      <button
                        onClick={() => { setRoleFilter('USER'); setFilterOpen(false); }}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          roleFilter === 'USER' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        普通用户
                      </button>
                    </div>
                  </div>
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