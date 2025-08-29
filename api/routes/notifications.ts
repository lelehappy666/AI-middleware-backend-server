import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';
// import { ValidationError } from '../utils/errors.js';
import { authMiddleware } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const router = Router();

// 存储活跃的SSE连接
export const sseConnections = new Map<string, Response>();

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  username: string;
  role: Role;
  tokenId?: string;
  jti?: string;
  iat: number;
  exp: number;
}

/**
 * SSE专用认证中间件 - 支持从query参数获取token
 */
const sseAuthMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    // 首先尝试从Authorization header获取token
    let token = '';
    const authHeader = req.headers.authorization;
    
    console.log('🔍 SSE Auth Debug - Headers:', req.headers.authorization ? 'Bearer token found' : 'No Bearer token');
    console.log('🔍 SSE Auth Debug - Query token:', req.query.token ? 'Query token found' : 'No query token');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔍 SSE Auth Debug - Using header token');
    } else {
      // 如果header中没有token，尝试从query参数获取
      token = req.query.token as string || '';
      console.log('🔍 SSE Auth Debug - Using query token');
    }
    
    if (!token) {
      console.log('❌ SSE Auth Debug - No token provided');
      res.status(401).json({
        success: false,
        error: '未提供访问令牌'
      });
      return;
    }

    // 验证JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // 检查token是否在数据库中存在且有效
    const tokenIdentifier = decoded.jti || decoded.tokenId;
    const session = await prisma.userSession.findFirst({
      where: {
        accessTokenJti: tokenIdentifier,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            isActive: true,
            lockedUntil: true
          }
        }
      }
    });

    if (!session || !session.user) {
      res.status(401).json({
        success: false,
        error: '访问令牌无效或已过期'
      });
      return;
    }

    // 检查用户是否被锁定
    if (session.user.lockedUntil && session.user.lockedUntil > new Date()) {
      res.status(423).json({
        success: false,
        error: '账户已被锁定，请稍后再试'
      });
      return;
    }

    // 检查用户是否激活
    if (!session.user.isActive) {
      res.status(403).json({
        success: false,
        error: '账户已被禁用'
      });
      return;
    }

    // 更新会话最后使用时间
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() }
    });

    // 将用户信息添加到请求对象
    req.user = {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      isActive: session.user.isActive
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: '访问令牌无效'
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: '访问令牌已过期'
      });
      return;
    }

    console.error('SSE Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: '认证服务异常'
    });
  }
};

/**
 * 获取实时通知流 (Server-Sent Events)
 * GET /api/notifications/stream
 */
router.get('/stream', sseAuthMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  // 设置SSE响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 发送初始连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', message: '通知连接已建立' })}\n\n`);

  // 存储连接
  sseConnections.set(userId, res);
  console.log(`🔗 SSE连接已建立，用户: ${userId}，当前连接数: ${sseConnections.size}`);
  
  // 广播在线用户数更新（用户上线）
  await broadcastOnlineUsersUpdate();

  // 处理客户端断开连接
  req.on('close', async () => {
    sseConnections.delete(userId);
    console.log(`🔌 SSE连接已断开，用户: ${userId}，当前连接数: ${sseConnections.size}`);
    
    // 广播在线用户数更新（用户下线）
    await broadcastOnlineUsersUpdate();
  });

  // 保持连接活跃
  const heartbeat = setInterval(() => {
    if (sseConnections.has(userId)) {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    } else {
      clearInterval(heartbeat);
    }
  }, 30000); // 每30秒发送心跳
}));

/**
 * 发送用户上线通知
 * @param userId 用户ID
 * @param username 用户名
 * @param name 用户姓名
 */
export const sendUserOnlineNotification = async (userId: string, username: string, name: string) => {
  const notification = {
    type: 'user_online',
    message: `${name || username} 已上线`,
    userId,
    username,
    name,
    timestamp: new Date().toISOString()
  };

  console.log(`🔔 发送用户上线通知: ${name || username} (${userId})`);
  console.log(`📡 当前SSE连接数: ${sseConnections.size}`);
  
  // 广播给所有连接的用户（包括自己，用于测试下线通知显示）
  let sentCount = 0;
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
      sentCount++;
      console.log(`✅ 通知已发送给用户: ${connectedUserId}`);
    } catch (error) {
      console.log(`❌ 发送通知失败，移除连接: ${connectedUserId}`);
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }
  
  console.log(`📊 上线通知发送完成，成功发送给 ${sentCount} 个用户`);

  // 保存通知到数据库
  try {
    await prisma.operationLog.create({
      data: {
        operationType: '用户上线通知',
        resourceType: 'USER',
        operationDetails: { 
          message: `${name || username} 已上线`,
          notificationType: 'user_online',
          targetUserId: userId
        },
        status: 'SUCCESS',
        userId,
        ipAddress: 'system',
        userAgent: 'notification-system'
      }
    });
  } catch (err) {
    console.error('Error sending user online notification:', err);
  }
};

/**
 * 发送用户下线通知
 * @param userId 用户ID
 * @param username 用户名
 * @param name 用户姓名
 */
export const sendUserOfflineNotification = async (userId: string, username: string, name: string) => {
  const notification = {
    type: 'user_offline',
    message: `${name || username} 已下线`,
    userId,
    username,
    name,
    timestamp: new Date().toISOString()
  };

  console.log(`🔔 发送用户下线通知: ${name || username} (${userId})`);
  console.log(`📡 当前SSE连接数: ${sseConnections.size}`);
  
  // 广播给所有连接的用户（包括自己，用于测试下线通知显示）
  let sentCount = 0;
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
      sentCount++;
      console.log(`✅ 通知已发送给用户: ${connectedUserId}`);
    } catch (error) {
      console.log(`❌ 发送通知失败，移除连接: ${connectedUserId}`);
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }
  
  console.log(`📊 下线通知发送完成，成功发送给 ${sentCount} 个用户`);

  // 保存通知到数据库
  try {
    await prisma.operationLog.create({
      data: {
        operationType: '用户下线通知',
        resourceType: 'USER',
        operationDetails: { 
          message: `${name || username} 已下线`,
          notificationType: 'user_offline',
          targetUserId: userId
        },
        status: 'SUCCESS',
        userId,
        ipAddress: 'system',
        userAgent: 'notification-system'
      }
    });
  } catch (err) {
    console.error('Error sending user offline notification:', err);
  }
};

/**
 * 获取历史通知
 * GET /api/notifications/history
 */
router.get('/history', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const notifications = await prisma.operationLog.findMany({
    where: {
      operationType: {
        in: ['用户上线通知', '用户下线通知']
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: offset,
    take: Number(limit),
    select: {
      id: true,
      operationType: true,
      operationDetails: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  });

  const total = await prisma.operationLog.count({
    where: {
      operationType: {
        in: ['用户上线通知', '用户下线通知']
      }
    }
  });

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

/**
 * 发送用户创建通知
 * @param userId 用户ID
 * @param username 用户名
 * @param name 用户姓名
 * @param createdBy 创建者ID
 */
export const sendUserCreatedNotification = async (userId: string, username: string, name: string, createdBy: string) => {
  const notification = {
    type: 'user_created',
    message: `新用户 ${name || username} 已创建`,
    userId,
    username,
    name,
    createdBy,
    timestamp: new Date().toISOString()
  };

  // 广播给所有连接的用户
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch {
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }

  // 保存通知到数据库
  try {
    await prisma.operationLog.create({
      data: {
        operationType: '用户创建通知',
        resourceType: 'USER',
        operationDetails: { 
          message: `新用户 ${name || username} 已创建`,
          notificationType: 'user_created',
          targetUserId: userId
        },
        status: 'SUCCESS',
        userId: createdBy,
        ipAddress: 'system',
        userAgent: 'notification-system'
      }
    });
  } catch (err) {
    console.error('Error sending user created notification:', err);
  }
};

/**
 * 发送用户删除通知
 * @param userId 用户ID
 * @param username 用户名
 * @param name 用户姓名
 * @param deletedBy 删除者ID
 */
export const sendUserDeletedNotification = async (userId: string, username: string, name: string, deletedBy: string) => {
  const notification = {
    type: 'user_deleted',
    message: `用户 ${name || username} 已被删除`,
    userId,
    username,
    name,
    deletedBy,
    timestamp: new Date().toISOString()
  };

  // 广播给所有连接的用户
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch {
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }

  // 保存通知到数据库
  try {
    await prisma.operationLog.create({
      data: {
        operationType: '用户删除通知',
        resourceType: 'USER',
        operationDetails: { 
          message: `用户 ${name || username} 已被删除`,
          notificationType: 'user_deleted',
          targetUserId: userId
        },
        status: 'SUCCESS',
        userId: deletedBy,
        ipAddress: 'system',
        userAgent: 'notification-system'
      }
    });
  } catch (err) {
    console.error('Error sending user deleted notification:', err);
  }
};

/**
 * 发送用户数统计更新通知
 * @param totalUsers 总用户数
 * @param onlineUsers 在线用户数
 */
export const sendUserStatsUpdateNotification = async (totalUsers: number, onlineUsers: number) => {
  const notification = {
    type: 'user_stats_update',
    message: '用户统计数据已更新',
    totalUsers,
    onlineUsers,
    timestamp: new Date().toISOString()
  };

  // 广播给所有连接的用户
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (err) {
      console.error('Error sending user stats update notification:', err);
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }
};

/**
 * 广播在线用户数更新
 */
export const broadcastOnlineUsersUpdate = async () => {
  try {
    const onlineUserIds = Array.from(sseConnections.keys());
    const totalUsers = await prisma.user.count();
    const onlineUsers = onlineUserIds.length;
    
    const notification = {
      type: 'user_stats_update',
      message: `当前在线用户数: ${onlineUsers}`,
      totalUsers,
      onlineUsers,
      onlineUserIds,
      timestamp: new Date().toISOString()
    };

    console.log(`📊 广播在线用户数更新: ${onlineUsers}/${totalUsers}`);
    
    // 广播给所有连接的用户
    let sentCount = 0;
    for (const [connectedUserId, connection] of sseConnections.entries()) {
      try {
        connection.write(`data: ${JSON.stringify(notification)}\n\n`);
        sentCount++;
      } catch (err) {
        console.error(`❌ 发送在线用户数更新失败，移除连接: ${connectedUserId}`);
        // 连接已断开，移除
        sseConnections.delete(connectedUserId);
      }
    }
    
    console.log(`📡 在线用户数更新广播完成，成功发送给 ${sentCount} 个用户`);
  } catch (error) {
    console.error('Error broadcasting online users update:', error);
  }
};

/**
 * 发送用户登录活动通知
 * @param userId 用户ID
 * @param username 用户名
 * @param name 用户姓名
 * @param ipAddress IP地址
 */
export const sendUserLoginActivityNotification = async (userId: string, username: string, name: string, ipAddress?: string) => {
  const notification = {
    type: 'user_login_activity',
    message: `${name || username} 登录了系统`,
    userId,
    username,
    name,
    ipAddress: ipAddress || 'unknown',
    timestamp: new Date().toISOString()
  };

  console.log(`🔔 发送用户登录活动通知: ${name || username} (${userId})`);
  console.log(`📡 当前SSE连接数: ${sseConnections.size}`);
  
  // 广播给所有连接的用户
  let sentCount = 0;
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
      sentCount++;
      console.log(`✅ 登录活动通知已发送给用户: ${connectedUserId}`);
    } catch (err) {
      console.error('Error sending user login activity notification:', err);
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }
  
  console.log(`📊 登录活动通知发送完成，成功发送给 ${sentCount} 个用户`);
};

/**
 * 发送用户登出活动通知
 * @param userId 用户ID
 * @param username 用户名
 * @param name 用户姓名
 * @param ipAddress IP地址
 */
export const sendUserLogoutActivityNotification = async (userId: string, username: string, name: string, ipAddress?: string) => {
  const notification = {
    type: 'user_logout_activity',
    message: `${name || username} 退出了系统`,
    userId,
    username,
    name,
    ipAddress: ipAddress || 'unknown',
    timestamp: new Date().toISOString()
  };

  console.log(`🔔 发送用户登出活动通知: ${name || username} (${userId})`);
  console.log(`📡 当前SSE连接数: ${sseConnections.size}`);
  
  // 广播给所有连接的用户
  let sentCount = 0;
  for (const [connectedUserId, connection] of sseConnections.entries()) {
    try {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
      sentCount++;
      console.log(`✅ 登出活动通知已发送给用户: ${connectedUserId}`);
    } catch {
      // 连接已断开，移除
      sseConnections.delete(connectedUserId);
    }
  }
  
  console.log(`📊 登出活动通知发送完成，成功发送给 ${sentCount} 个用户`);
};

/**
 * 获取当前在线用户列表
 * GET /api/notifications/online-users
 */
router.get('/online-users', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const onlineUserIds = Array.from(sseConnections.keys());
  
  const onlineUsers = await prisma.user.findMany({
    where: {
      id: {
        in: onlineUserIds
      }
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      lastLoginAt: true
    }
  });

  res.json({
    success: true,
    data: {
      onlineUsers,
      count: onlineUsers.length
    }
  });
}));

/**
 * 获取用户统计信息
 * GET /api/notifications/user-stats
 */
router.get('/user-stats', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const onlineUserIds = Array.from(sseConnections.keys());
  const totalUsers = await prisma.user.count();
  const onlineUsers = onlineUserIds.length;

  res.json({
    success: true,
    data: {
      totalUsers,
      onlineUsers
    }
  });
}));

export default router;