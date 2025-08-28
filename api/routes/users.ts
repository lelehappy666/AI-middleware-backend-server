import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { Role } from '@prisma/client';

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
    sortOrder = 'desc'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  // 构建查询条件
  const where: {
    OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }>;
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
  const validSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'lastLoginAt'];
  if (validSortFields.includes(sortBy as string)) {
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  // 查询用户列表和总数
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
    },
      orderBy,
      skip,
      take: limitNum
    }),
    prisma.user.count({ where })
  ]);

  // 处理用户数据
  const processedUsers = users.map(user => ({
    ...user,
    isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false
  }));

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
    select: { id: true, role: true, email: true }
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
    updateData.name = name.trim();
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
      name: true,
      role: true,
      isActive: true,
      updatedAt: true
    }
  });

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

export default router;