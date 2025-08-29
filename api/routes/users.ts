import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { Role } from '@prisma/client';
import { sendUserOnlineNotification, sendUserOfflineNotification, sendUserCreatedNotification, sendUserDeletedNotification, sendUserStatsUpdateNotification, sseConnections } from './notifications.js';

const router = Router();

/**
 * 获取当前用户信息
 * GET /api/users/profile
 */
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      loginAttempts: true,
      lockedUntil: true
    }
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false
      }
    }
  });
}));

/**
 * 更新当前用户信息
 * PUT /api/users/profile
 */
router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { name, currentPassword, newPassword } = req.body;

  if (!name || name.trim().length === 0) {
    throw new ValidationError('用户名不能为空');
  }

  if (name.trim().length > 50) {
    throw new ValidationError('用户名长度不能超过50个字符');
  }

  const updateData: {
    name: string;
    updatedAt: Date;
    password?: string;
  } = {
    name: name.trim(),
    updatedAt: new Date()
  };

  // 如果要更改密码
  if (newPassword) {
    if (!currentPassword) {
      throw new ValidationError('请提供当前密码');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('新密码长度至少8个字符');
    }

    // 验证当前密码
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true }
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new ValidationError('当前密码错误');
    }

    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    updateData.password = await bcrypt.hash(newPassword, saltRounds);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      updatedAt: true
    }
  });

  res.json({
    success: true,
    message: '用户信息更新成功',
    data: { user: updatedUser }
  });
}));

/**
 * 获取用户列表（管理员权限）
 * GET /api/users
 */
router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '10',
    search = '',
    role = '',
    isActive = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includePasswords = 'false'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  // 构建查询条件
  const where: {
    OR?: Array<{ name?: { contains: string; mode: 'insensitive' } }>;
    role?: Role;
    isActive?: boolean;
  } = {};

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  if (role && Object.values(Role).includes(role as Role)) {
    where.role = role as Role;
  }

  if (isActive !== '') {
    where.isActive = isActive === 'true';
  }

  // 构建排序条件
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  const validSortFields = ['createdAt', 'updatedAt', 'name', 'lastLoginAt'];
  if (validSortFields.includes(sortBy as string)) {
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  // 根据用户权限决定是否包含密码信息
  const shouldIncludePasswords = includePasswords === 'true' && req.user?.role === Role.SUPER_ADMIN;
  
  const selectFields: {
    id: boolean;
    name: boolean;
    role: boolean;
    isActive: boolean;
    createdAt: boolean;
    updatedAt: boolean;
    lastLoginAt: boolean;
    loginAttempts: boolean;
    lockedUntil: boolean;
    passwordHash?: boolean;
  } = {
    id: true,
    name: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    lastLoginAt: true,
    loginAttempts: true,
    lockedUntil: true
  };

  // 只有超级管理员可以获取密码哈希（用于显示密码提示）
  if (shouldIncludePasswords) {
    selectFields.passwordHash = true;
  }

  // 查询用户列表和总数
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: selectFields,
      orderBy,
      skip,
      take: limitNum
    }),
    prisma.user.count({ where })
  ]);

  // 处理用户数据
  const processedUsers = users.map(user => {
    const processedUser: {
      id: string;
      name: string;
      role: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      lastLoginAt: Date | null;
      loginAttempts: number;
      lockedUntil: Date | null;
      isLocked: boolean;
      hasPassword?: boolean;
      passwordHint?: string;
      passwordHash?: string;
    } = {
      ...user,
      isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false
    };
    
    // 为超级管理员提供密码提示（显示前几位字符）
    if (shouldIncludePasswords && user.passwordHash) {
      // 由于密码是加密的，我们提供一个占位符让前端知道有密码
      processedUser.hasPassword = true;
      processedUser.passwordHint = '••••••••'; // 8个点表示有密码
    }
    
    // 移除密码哈希，不返回给前端
    delete processedUser.passwordHash;
    
    return processedUser;
  });

  res.json({
    success: true,
    data: {
      users: processedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
}));

/**
 * 获取单个用户详情（管理员权限）
 * GET /api/users/:id
 */
router.get('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('用户ID不能为空');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      loginAttempts: true,
      lockedUntil: true,
      _count: {
        select: {
          sessions: true,
          operationLogs: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false,
        sessionCount: user._count.sessions,
        operationCount: user._count.operationLogs
      }
    }
  });
}));

/**
 * 创建用户（管理员权限）
 * POST /api/users
 */
router.post('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { name, password, role = Role.USER } = req.body;

  // 验证必填字段
  if (!name || !password) {
    throw new ValidationError('用户名和密码不能为空');
  }

  // 验证用户名长度
  if (name.trim().length === 0 || name.trim().length > 50) {
    throw new ValidationError('用户名长度必须在1-50个字符之间');
  }

  // 验证密码强度
  if (password.length < 8) {
    throw new ValidationError('密码长度至少8个字符');
  }

  // 验证角色
  if (!Object.values(Role).includes(role)) {
    throw new ValidationError('无效的用户角色');
  }

  // 只有超级管理员可以创建管理员和超级管理员
  if ((role === Role.ADMIN || role === Role.SUPER_ADMIN) && req.user?.role !== Role.SUPER_ADMIN) {
    throw new ValidationError('权限不足，无法创建管理员用户');
  }

  // 检查用户名是否已存在
  const existingUser = await prisma.user.findFirst({
    where: { name: name.trim() }
  });

  if (existingUser) {
    throw new ConflictError('用户名已被使用');
  }

  // 加密密码
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // 创建用户
  const newUser = await prisma.user.create({
    data: {
      username: name.trim().toLowerCase(), // 使用name作为username
      name: name.trim(),
      passwordHash: hashedPassword,
      role,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  // 发送用户创建通知
  await sendUserCreatedNotification(newUser.id, newUser.name, newUser.name, req.user?.id || 'system');

  // 发送用户统计更新通知
  const totalUsers = await prisma.user.count();
  const onlineUsers = Array.from(sseConnections.keys()).length;
  await sendUserStatsUpdateNotification(totalUsers, onlineUsers);

  res.status(201).json({
    success: true,
    message: '用户创建成功',
    data: { user: newUser }
  });
}));

/**
 * 更新用户（管理员权限）
 * PUT /api/users/:id
 */
router.put('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, isActive, password } = req.body;

  if (!id) {
    throw new ValidationError('用户ID不能为空');
  }

  // 检查用户是否存在
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true }
  });

  if (!existingUser) {
    throw new NotFoundError('用户不存在');
  }

  // 防止用户修改自己的状态和角色
  if (existingUser.id === req.user?.id) {
    if (isActive === false) {
      throw new ValidationError('不能禁用自己的账户');
    }
    if (role && role !== existingUser.role) {
      throw new ValidationError('不能修改自己的角色');
    }
  }

  // 只有超级管理员可以修改管理员角色
  if (role && (role === Role.ADMIN || role === Role.SUPER_ADMIN || existingUser.role === Role.SUPER_ADMIN)) {
    if (req.user?.role !== Role.SUPER_ADMIN) {
      throw new ValidationError('权限不足，无法修改管理员角色');
    }
  }

  const updateData: {
    updatedAt: Date;
    name?: string;
    username?: string;
    role?: Role;
    isActive?: boolean;
    passwordHash?: string;
    loginAttempts?: number;
    lockedUntil?: Date | null;
  } = {
    updatedAt: new Date()
  };

  if (name !== undefined) {
    if (!name || name.trim().length === 0 || name.trim().length > 50) {
      throw new ValidationError('用户名长度必须在1-50个字符之间');
    }
    const trimmedName = name.trim();
    
    // 检查用户名是否已被其他用户使用
    const existingUserWithSameName = await prisma.user.findFirst({
      where: {
        username: trimmedName,
        id: { not: id } // 排除当前用户
      }
    });
    
    if (existingUserWithSameName) {
      throw new ConflictError('该用户名已被使用');
    }
    
    updateData.name = trimmedName;
    // 同时更新username字段，确保用户名和姓名保持一致
    updateData.username = trimmedName;
  }

  if (role !== undefined) {
    if (!Object.values(Role).includes(role)) {
      throw new ValidationError('无效的用户角色');
    }
    updateData.role = role;
  }

  if (isActive !== undefined) {
    updateData.isActive = Boolean(isActive);
  }

  if (password) {
    if (password.length < 8) {
      throw new ValidationError('密码长度至少8个字符');
    }
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    updateData.passwordHash = await bcrypt.hash(password, saltRounds);
    updateData.loginAttempts = 0;
    updateData.lockedUntil = null;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      updatedAt: true
    }
  });

  // 如果修改了密码且是用户自己修改密码，则使该用户的所有会话失效
  // 但如果是管理员修改其他用户的密码，则不影响管理员自己的会话
  if (password && existingUser.id === req.user?.id) {
    // 只有用户修改自己的密码时才使会话失效
    await prisma.userSession.updateMany({
      where: {
        userId: existingUser.id,
        isActive: true
      },
      data: {
        isActive: false,
        lastUsedAt: new Date()
      }
    });
  }

  res.json({
    success: true,
    message: '用户更新成功',
    data: { user: updatedUser }
  });
}));

/**
 * 删除用户（超级管理员权限）
 * DELETE /api/users/:id
 */
router.delete('/:id', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('用户ID不能为空');
  }

  // 防止删除自己
  if (id === req.user?.id) {
    throw new ValidationError('不能删除自己的账户');
  }

  // 检查用户是否存在
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true }
  });

  if (!existingUser) {
    throw new NotFoundError('用户不存在');
  }

  // 删除用户（级联删除相关数据）
  await prisma.user.delete({
    where: { id }
  });

  // 发送用户删除通知
  await sendUserDeletedNotification(existingUser.id, existingUser.name, existingUser.name, req.user?.id || 'system');

  // 发送用户统计更新通知
  const totalUsers = await prisma.user.count();
  const onlineUsers = Array.from(sseConnections.keys()).length;
  await sendUserStatsUpdateNotification(totalUsers, onlineUsers);

  res.json({
    success: true,
    message: '用户删除成功'
  });
}));

/**
 * 解锁用户（管理员权限）
 * POST /api/users/:id/unlock
 */
router.post('/:id/unlock', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('用户ID不能为空');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, lockedUntil: true }
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  if (!user.lockedUntil || user.lockedUntil <= new Date()) {
    throw new ValidationError('用户账户未被锁定');
  }

  await prisma.user.update({
    where: { id },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: '用户解锁成功'
  });
}));

/**
 * 获取用户原始密码（仅超级管理员权限）
 * GET /api/users/:id/password
 */
router.get('/:id/password', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new ValidationError('用户ID不能为空');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plainPassword: true
    }
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  res.json({
    success: true,
    data: {
      userId: user.id,
      username: user.name,
      password: user.plainPassword || '密码未设置明文存储'
    }
  });
}));

/**
 * 获取用户统计信息（管理员权限）
 * GET /api/users/stats
 */
router.get('/stats/overview', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const [totalUsers, activeUsers, lockedUsers, roleStats] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({
      where: {
        lockedUntil: {
          gt: new Date()
        }
      }
    }),
    prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })
  ]);

  const roleDistribution = roleStats.reduce((acc, stat) => {
    acc[stat.role] = stat._count.role;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      lockedUsers,
      roleDistribution
    }
  });
}));

/**
 * 用户上线接口
 * POST /api/users/online
 */
router.post('/online', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // 绿色控制台提示
  console.log('\x1b[32m🟢 收到用户上线请求\x1b[0m');
  
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { onlineTime } = req.body;
  const userId = req.user.id;

  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true
    }
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  // 更新用户最后登录时间
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: onlineTime ? new Date(onlineTime) : new Date(),
      updatedAt: new Date()
    }
  });

  // 发送上线通知
  await sendUserOnlineNotification(userId, user.username || user.name, user.name);
  
  // 广播在线用户数更新
  const { broadcastOnlineUsersUpdate } = await import('./notifications.js');
  await broadcastOnlineUsersUpdate();

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      operationType: '用户上线',
      resourceType: 'USER',
      operationDetails: { 
        message: `用户 ${user.name} 上线`,
        onlineTime: onlineTime || new Date().toISOString()
      },
      status: 'SUCCESS',
      userId,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }
  });

  res.json({
    success: true,
    message: '用户上线记录成功',
    data: {
      userId,
      username: user.name,
      onlineTime: onlineTime || new Date().toISOString()
    }
  });
}));

/**
 * 用户下线接口
 * POST /api/users/offline
 */
router.post('/offline', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // 绿色控制台提示
  console.log('\x1b[32m🟢 收到用户下线请求\x1b[0m');
  
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { offlineTime } = req.body;
  const userId = req.user.id;

  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true
    }
  });

  if (!user) {
    throw new NotFoundError('用户不存在');
  }

  // 发送下线通知
  await sendUserOfflineNotification(userId, user.username || user.name, user.name);
  
  // 广播在线用户数更新
  const { broadcastOnlineUsersUpdate } = await import('./notifications.js');
  await broadcastOnlineUsersUpdate();

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      operationType: '用户下线',
      resourceType: 'USER',
      operationDetails: { 
        message: `用户 ${user.name} 下线`,
        offlineTime: offlineTime || new Date().toISOString()
      },
      status: 'SUCCESS',
      userId,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }
  });

  res.json({
    success: true,
    message: '用户下线记录成功',
    data: {
      userId,
      username: user.name,
      offlineTime: offlineTime || new Date().toISOString()
    }
  });
}));

export default router;