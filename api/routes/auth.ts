import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ValidationError, AuthenticationError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as StringValue;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue;

// 注册功能已移除 - 系统仅支持单一超级管理员账户

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { username, password, rememberMe = false } = req.body;

  // 验证输入
  if (!username || !password) {
    throw new ValidationError('用户名和密码都是必填的');
  }

  // 验证用户名格式（支持中英文字符、数字、下划线）
  const usernameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,20}$/;
  if (!usernameRegex.test(username)) {
    throw new ValidationError('用户名格式不正确，支持中英文字符、数字、下划线，长度2-20位');
  }

  // 查找用户
  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    throw new AuthenticationError('用户名或密码错误');
  }

  // 检查用户是否被锁定
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const lockTimeRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
    throw new AuthenticationError(`账户已被锁定，请在 ${lockTimeRemaining} 分钟后重试`);
  }

  // 检查用户是否激活
  if (!user.isActive) {
    throw new AuthenticationError('账户已被禁用，请联系管理员');
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    // 增加失败次数
    const failedAttempts = (user.loginAttempts || 0) + 1;
    const maxAttempts = 5;
    const lockDuration = 30; // 30分钟

    const updateData: {
      loginAttempts: number;
      lockedUntil?: Date;
    } = {
      loginAttempts: failedAttempts
    };

    // 如果失败次数达到上限，锁定账户
    if (failedAttempts >= maxAttempts) {
      updateData.lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    // 记录失败日志
    await prisma.operationLog.create({
      data: {
        operationType: '用户登录',
        resourceType: 'USER',
        operationDetails: { message: `登录失败: ${username}，失败次数: ${failedAttempts}` },
        status: 'FAILED',
        errorMessage: '密码错误',
        userId: user.id,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      }
    });

    if (failedAttempts >= maxAttempts) {
      throw new AuthenticationError(`密码错误次数过多，账户已被锁定 ${lockDuration} 分钟`);
    }

    throw new AuthenticationError(`用户名或密码错误，还有 ${maxAttempts - failedAttempts} 次尝试机会`);
  }

  // 登录成功，重置失败次数
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });

  // 生成JWT tokens
  const accessTokenJti = uuidv4();
  const accessToken = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      jti: accessTokenJti
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenId: uuidv4()
    },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

  // 计算过期时间
  const accessTokenExpiresAt = new Date(Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000));
  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 创建用户会话
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
      accessTokenJti: accessTokenJti,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      isActive: true,
      expiresAt: refreshTokenExpiresAt
    }
  });

  // 记录成功日志
  await prisma.operationLog.create({
    data: {
      operationType: '用户登录',
      resourceType: 'USER',
      operationDetails: { message: `用户登录成功: ${username}` },
      status: 'SUCCESS',
      userId: user.id,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }
  });

  // 返回用户信息和token
  const userInfo = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

  res.json({
    success: true,
    message: '登录成功',
    data: {
      user: userInfo,
      accessToken,
      refreshToken,
      expiresAt: accessTokenExpiresAt.toISOString(),
      sessionId: session.id
    }
  });
}));

/**
 * 刷新访问令牌
 * POST /api/auth/refresh
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ValidationError('刷新令牌不能为空');
  }

  try {
    // 验证刷新令牌
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string; tokenId: string };

    // 查找所有活跃会话
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: decoded.userId,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    // 验证refreshToken hash
    let validSession = null;
    for (const session of sessions) {
      const isValidToken = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (isValidToken) {
        validSession = session;
        break;
      }
    }

    if (!validSession || !validSession.user.isActive) {
      throw new AuthenticationError('无效的刷新令牌');
    }

    // 生成新的访问令牌
    const newJti = uuidv4();
    const newAccessToken = jwt.sign(
      {
        userId: validSession.user.id,
        username: validSession.user.username,
        role: validSession.user.role,
        jti: newJti
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const newAccessTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 更新会话
    await prisma.userSession.update({
      where: { id: validSession.id },
      data: {
        accessTokenJti: newJti,
        lastUsedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: {
        accessToken: newAccessToken,
        expiresAt: newAccessTokenExpiresAt.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('无效的刷新令牌');
    }
    throw error;
  }
}));

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const userId = req.user!.id;

  if (sessionId) {
    // 登出指定会话
    await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId
      },
      data: {
        isActive: false,
        lastUsedAt: new Date()
      }
    });
  } else {
    // 登出所有会话
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: {
        isActive: false,
        lastUsedAt: new Date()
      }
    });
  }

  // 记录登出日志
  await prisma.operationLog.create({
    data: {
      operationType: '用户登出',
      resourceType: 'USER',
      operationDetails: { message: sessionId ? `登出会话: ${sessionId}` : '登出所有会话' },
      status: 'SUCCESS',
      userId,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }
  });

  res.json({
    success: true,
    message: '登出成功'
  });
}));

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true
    }
  });

  if (!user) {
    throw new AuthenticationError('用户不存在');
  }

  res.json({
    success: true,
    data: { user }
  });
}));

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.user!.id;

  // 验证输入
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new ValidationError('所有字段都是必填的');
  }

  if (newPassword !== confirmPassword) {
    throw new ValidationError('新密码和确认密码不匹配');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('新密码长度至少为6位');
  }

  // 获取用户当前密码
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true }
  });

  if (!user) {
    throw new AuthenticationError('用户不存在');
  }

  // 验证当前密码
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new ValidationError('当前密码错误');
  }

  // 加密新密码
  const saltRounds = 12;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  // 更新密码
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashedNewPassword,
      updatedAt: new Date()
    }
  });

  // 使所有会话失效（强制重新登录）
  await prisma.userSession.updateMany({
    where: {
      userId,
      isActive: true
    },
    data: {
      isActive: false,
      lastUsedAt: new Date()
    }
  });

  // 记录操作日志
  await prisma.operationLog.create({
    data: {
      operationType: '修改密码',
      resourceType: 'USER',
      operationDetails: { message: '用户修改密码成功' },
      status: 'SUCCESS',
      userId,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    }
  });

  res.json({
    success: true,
    message: '密码修改成功，请重新登录'
  });
}));

export default router;