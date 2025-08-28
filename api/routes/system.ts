import { Router, Request, Response } from 'express';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { getApiStats } from '../middleware/logger.js';
import { OperationStatus } from '@prisma/client';

const router = Router();

/**
 * 获取系统状态
 * GET /api/system/status
 */
router.get('/status', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // 系统信息
  const systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: {
      process: uptime,
      system: os.uptime(),
      formatted: formatUptime(uptime)
    },
    memory: {
      used: memoryUsage.rss,
      heap: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal
      },
      external: memoryUsage.external,
      system: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      }
    },
    cpu: {
      usage: cpuUsage,
      cores: os.cpus().length,
      loadAverage: os.loadavg()
    }
  };

  // 数据库连接状态
  let dbStatus = 'connected';
  let dbStats = null;
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    const [userCount, fileCount, sessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.file.count(),
      prisma.userSession.count({ where: { isActive: true } })
    ]);
    
    dbStats = {
      users: userCount,
      files: fileCount,
      activeSessions: sessionCount
    };
  } catch (error) {
    dbStatus = 'disconnected';
    console.error('Database connection check failed:', error);
  }

  // API统计
  const apiStats = getApiStats();

  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      system: systemInfo,
      database: {
        status: dbStatus,
        stats: dbStats
      },
      api: apiStats
    }
  });
}));

/**
 * 获取系统性能指标
 * GET /api/system/metrics
 */
router.get('/metrics', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { timeRange = '1h' } = req.query;
  
  // 计算时间范围
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
  }

  // 获取操作日志统计
  const [operationStats, errorLogs, userActivity] = await Promise.all([
    prisma.operationLog.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startTime
        }
      },
      _count: {
        status: true
      }
    }),
    prisma.operationLog.findMany({
      where: {
        status: OperationStatus.FAILED,
        createdAt: {
          gte: startTime
        }
      },
      select: {
        id: true,
        operationType: true,
        errorMessage: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    }),
    prisma.operationLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: startTime
        }
      },
      _count: {
        userId: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    })
  ]);

  // 处理操作统计
  const operationDistribution = operationStats.reduce((acc, stat) => {
    acc[stat.status] = stat._count.status;
    return acc;
  }, {} as Record<string, number>);

  // 获取活跃用户详情
  const activeUserIds = userActivity.map(activity => activity.userId).filter(Boolean);
  const activeUsers = activeUserIds.length > 0 ? await prisma.user.findMany({
    where: {
      id: {
        in: activeUserIds as string[]
      }
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  }) : [];

  const userActivityWithDetails = userActivity.map(activity => {
    const user = activeUsers.find(u => u.id === activity.userId);
    return {
      user: user || { id: activity.userId, name: 'Unknown', email: 'unknown@example.com' },
      operationCount: activity._count.userId
    };
  });

  res.json({
    success: true,
    data: {
      timeRange,
      startTime,
      endTime: now,
      operations: operationDistribution,
      recentErrors: errorLogs,
      activeUsers: userActivityWithDetails
    }
  });
}));

/**
 * 获取操作日志
 * GET /api/system/logs
 */
router.get('/logs', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const {
    page = '1',
    limit = '50',
    userId = '',
    operation = '',
    status = '',
    startDate = '',
    endDate = ''
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  // 构建查询条件
  const where: {
    userId?: string;
    operationType?: { contains: string; mode: 'insensitive' };
    status?: OperationStatus;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (userId) {
    where.userId = userId as string;
  }

  if (operation) {
    where.operationType = {
      contains: operation as string,
      mode: 'insensitive'
    };
  }

  if (status && Object.values(OperationStatus).includes(status as OperationStatus)) {
    where.status = status as OperationStatus;
  }

  if (startDate) {
    where.createdAt = {
      ...where.createdAt,
      gte: new Date(startDate as string)
    };
  }

  if (endDate) {
    where.createdAt = {
      ...where.createdAt,
      lte: new Date(endDate as string)
    };
  }

  const [logs, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitNum
    }),
    prisma.operationLog.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      logs,
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
 * 记录操作日志
 * POST /api/system/logs
 */
router.post('/logs', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { operation, details, status = OperationStatus.SUCCESS, errorMessage } = req.body;

  if (!operation) {
    throw new ValidationError('操作名称不能为空');
  }

  const log = await prisma.operationLog.create({
    data: {
      operationType: operation,
      resourceType: 'SYSTEM',
      operationDetails: details ? { message: details } : null,
      status,
      errorMessage: errorMessage || null,
      userId: req.user.id,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: '操作日志记录成功',
    data: { log }
  });
}));

/**
 * 清理操作日志（超级管理员权限）
 * DELETE /api/system/logs/cleanup
 */
router.delete('/logs/cleanup', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { days = '30' } = req.query;
  
  const daysNum = Math.max(1, parseInt(days as string, 10));
  const cutoffDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

  const deleteResult = await prisma.operationLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });

  res.json({
    success: true,
    message: `成功清理 ${deleteResult.count} 条操作日志`,
    data: {
      deletedCount: deleteResult.count,
      cutoffDate
    }
  });
}));

/**
 * 获取磁盘使用情况
 * GET /api/system/disk
 */
router.get('/disk', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  
  let diskUsage = {
    totalSize: 0,
    fileCount: 0,
    directories: [] as Array<{ name: string; size: number; fileCount: number }>
  };

  try {
    // 计算上传目录大小
    const stats = await calculateDirectorySize(uploadDir);
    diskUsage = stats;
  } catch {
    console.warn('计算磁盘使用情况失败');
  }

  // 获取数据库中的文件统计
  const [dbFileCount, dbTotalSize] = await Promise.all([
    prisma.file.count(),
    prisma.file.aggregate({
      _sum: {
        fileSize: true
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      disk: diskUsage,
      database: {
        fileCount: dbFileCount,
        totalSize: dbTotalSize._sum.fileSize || 0
      },
      system: {
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        usedMemory: os.totalmem() - os.freemem()
      }
    }
  });
}));

/**
 * 系统健康检查
 * GET /api/system/health
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const checks = {
    database: false,
    memory: false,
    disk: false
  };

  let overallHealth = 'healthy';
  const issues = [];

  // 数据库检查
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
    issues.push('数据库连接失败');
    overallHealth = 'unhealthy';
  }

  // 内存检查
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.rss / os.totalmem()) * 100;
  if (memoryUsagePercent < 90) {
    checks.memory = true;
  } else {
    checks.memory = false;
    issues.push('内存使用率过高');
    overallHealth = 'degraded';
  }

  // 磁盘检查（简单检查）
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.access(uploadDir);
    checks.disk = true;
  } catch {
    checks.disk = false;
    issues.push('上传目录不可访问');
    overallHealth = 'degraded';
  }

  const statusCode = overallHealth === 'healthy' ? 200 : overallHealth === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    success: overallHealth !== 'unhealthy',
    data: {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      checks,
      issues: issues.length > 0 ? issues : undefined,
      uptime: process.uptime(),
      version: '1.0.0'
    }
  });
}));

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0) parts.push(`${secs}秒`);

  return parts.join(' ') || '0秒';
}

/**
 * 计算目录大小
 */
async function calculateDirectorySize(dirPath: string): Promise<{
  totalSize: number;
  fileCount: number;
  directories: Array<{ name: string; path: string; size: number; fileCount: number }>;
}> {
  let totalSize = 0;
  let fileCount = 0;
  const directories: Array<{ name: string; path: string; size: number; fileCount: number }> = [];

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        const subDirStats = await calculateDirectorySize(itemPath);
        directories.push({
          name: item.name,
          path: itemPath,
          size: subDirStats.totalSize,
          fileCount: subDirStats.fileCount
        });
        totalSize += subDirStats.totalSize;
        fileCount += subDirStats.fileCount;
      } else if (item.isFile()) {
        const stats = await fs.stat(itemPath);
        totalSize += stats.size;
        fileCount++;
      }
    }
  } catch (error) {
    console.warn(`无法读取目录 ${dirPath}:`, error);
  }

  return { totalSize, fileCount, directories };
}

export default router;