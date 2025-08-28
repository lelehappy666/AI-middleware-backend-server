import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { Role } from '@prisma/client';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 扩展Request接口，添加用户信息
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      name: string;
      role: Role;
      isActive: boolean;
    };
    id?: string;
    rawBody?: Buffer;
  }
}

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
 * JWT认证中间件
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: '未提供访问令牌'
      });
      return;
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: '访问令牌格式错误'
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

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: '认证服务异常'
    });
  }
};

/**
 * 权限检查中间件工厂函数
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '用户未认证'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({
        success: false,
        error: '权限不足'
      });
      return;
    }

    next();
  };
};

/**
 * 超级管理员权限检查
 */
export const requireSuperAdmin = requireRole([Role.SUPER_ADMIN]);

/**
 * 管理员权限检查（包括超级管理员）
 */
export const requireAdmin = requireRole([Role.SUPER_ADMIN, Role.ADMIN]);

/**
 * 可选认证中间件（不强制要求认证）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    const session = await prisma.userSession.findFirst({
      where: {
        accessTokenJti: decoded.jti,
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
            isActive: true
          }
        }
      }
    });

    if (session && session.user && session.user.isActive) {
      req.user = {
        id: session.user.id,
        username: session.user.username,
        name: session.user.name,
        role: session.user.role,
        isActive: session.user.isActive
      };
    }

    next();
  } catch {
    // 可选认证失败时不阻止请求继续
    next();
  }
};