import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { shouldBlockLog } from '../config/logConfig';

/**
 * 请求日志接口
 */
interface RequestLog {
  id: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
  error?: string;
}

/**
 * 生成请求ID中间件
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = new Date();
  const requestLog: RequestLog = {
    id: req.id || uuidv4(),
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    startTime
  };

  // 记录请求开始（应用日志过滤）
  const startMessage = `[${requestLog.startTime.toISOString()}] ${requestLog.method} ${requestLog.url} - ${requestLog.ip} - ${requestLog.id}`;
  if (!shouldBlockLog(startMessage)) {
    console.log(startMessage);
  }

  // 监听响应结束事件
  res.on('finish', () => {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    requestLog.endTime = endTime;
    requestLog.duration = duration;
    requestLog.statusCode = res.statusCode;
    requestLog.contentLength = parseInt(res.get('Content-Length') || '0', 10);
    requestLog.userId = req.user?.id;

    // 根据状态码选择日志级别
    const logLevel = getLogLevel(res.statusCode);
    const logMessage = formatLogMessage(requestLog);

    // 应用日志过滤规则
    if (!shouldBlockLog(logMessage)) {
      switch (logLevel) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'info':
        default:
          console.log(logMessage);
          break;
      }
    }
  });

  // 监听响应错误事件
  res.on('error', (error: Error) => {
    requestLog.error = error.message;
    console.error(`[${new Date().toISOString()}] Request Error - ${requestLog.id}:`, error);
  });

  next();
};

/**
 * 根据状态码获取日志级别
 */
const getLogLevel = (statusCode: number): 'info' | 'warn' | 'error' => {
  if (statusCode >= 500) {
    return 'error';
  } else if (statusCode >= 400) {
    return 'warn';
  } else {
    return 'info';
  }
};

/**
 * 格式化日志消息
 */
const formatLogMessage = (log: RequestLog): string => {
  const statusIcon = getStatusIcon(log.statusCode || 0);
  // const durationColor = getDurationColor(log.duration || 0);
  
  let message = `[${log.endTime?.toISOString()}] ${statusIcon} ${log.method} ${log.url}`;
  message += ` - ${log.statusCode} - ${log.duration}ms`;
  
  if (log.contentLength && log.contentLength > 0) {
    message += ` - ${formatBytes(log.contentLength)}`;
  }
  
  if (log.userId) {
    message += ` - User: ${log.userId}`;
  }
  
  message += ` - ${log.ip} - ${log.id}`;
  
  return message;
};

/**
 * 获取状态码图标
 */
const getStatusIcon = (statusCode: number): string => {
  if (statusCode >= 500) {
    return '❌'; // 服务器错误
  } else if (statusCode >= 400) {
    return '⚠️';  // 客户端错误
  } else if (statusCode >= 300) {
    return '↩️';  // 重定向
  } else if (statusCode >= 200) {
    return '✅'; // 成功
  } else {
    return '❓'; // 其他
  }
};

/**
 * 获取持续时间颜色（用于终端输出）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getDurationColor = (duration: number): string => {
  if (duration > 1000) {
    return '\x1b[31m'; // 红色 - 慢
  } else if (duration > 500) {
    return '\x1b[33m'; // 黄色 - 中等
  } else {
    return '\x1b[32m'; // 绿色 - 快
  }
};

/**
 * 格式化字节数
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * API访问统计中间件
 */
export const apiStats = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 更新总体统计
    globalStats.totalRequests++;
    globalStats.responseTimes.push(duration);
    
    if (res.statusCode < 400) {
      globalStats.successRequests++;
    } else {
      globalStats.errorRequests++;
    }
    
    // 计算平均响应时间（保留最近1000个请求）
    if (globalStats.responseTimes.length > 1000) {
      globalStats.responseTimes = globalStats.responseTimes.slice(-1000);
    }
    globalStats.averageResponseTime = globalStats.responseTimes.reduce((a, b) => a + b, 0) / globalStats.responseTimes.length;
    
    // 更新端点统计
    const endpointStats = globalStats.endpoints.get(endpoint) || { count: 0, avgTime: 0, errors: 0 };
    endpointStats.count++;
    endpointStats.avgTime = (endpointStats.avgTime * (endpointStats.count - 1) + duration) / endpointStats.count;
    
    if (res.statusCode >= 400) {
      endpointStats.errors++;
    }
    
    globalStats.endpoints.set(endpoint, endpointStats);
  });
  
  next();
};

// 全局统计对象
const globalStats = {
  totalRequests: 0,
  successRequests: 0,
  errorRequests: 0,
  averageResponseTime: 0,
  responseTimes: [] as number[],
  endpoints: new Map<string, { count: number; avgTime: number; errors: number }>()
};

/**
 * 获取API统计信息
 */
export const getApiStats = () => {
  return {
    totalRequests: globalStats.totalRequests,
    successRequests: globalStats.successRequests,
    errorRequests: globalStats.errorRequests,
    successRate: globalStats.totalRequests > 0 ? (globalStats.successRequests / globalStats.totalRequests * 100).toFixed(2) + '%' : '0%',
    averageResponseTime: Math.round(globalStats.averageResponseTime) + 'ms',
    endpoints: Object.fromEntries(globalStats.endpoints)
  };
};