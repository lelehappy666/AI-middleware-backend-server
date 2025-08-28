import { Request, Response, NextFunction } from 'express';
import { Prisma, Role } from '@prisma/client';

// 扩展Request接口
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      name: string;
      role: Role;
      isActive: boolean;
    };
  }
}

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  public field?: string;
  public value?: unknown;

  constructor(message: string, field?: string, value?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

/**
 * 认证错误类
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授权错误类
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 资源未找到错误类
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

/**
 * 冲突错误类
 */
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * 速率限制错误类
 */
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

/**
 * 处理Prisma错误
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002': {
      // 唯一约束违反
      const target = error.meta?.target as string[];
      const field = target?.[0] || '字段';
      return new ConflictError(`${field}已存在`);
    }
    
    case 'P2025':
      // 记录未找到
      return new NotFoundError('记录未找到');
    
    case 'P2003':
      // 外键约束违反
      return new ValidationError('关联数据不存在');
    
    case 'P2014':
      // 关联记录不存在
      return new ValidationError('关联记录不存在');
    
    case 'P2021':
      // 表不存在
      return new AppError('数据表不存在', 500, 'DATABASE_ERROR');
    
    case 'P2022':
      // 列不存在
      return new AppError('数据列不存在', 500, 'DATABASE_ERROR');
    
    default:
      console.error('Unhandled Prisma error:', error);
      return new AppError('数据库操作失败', 500, 'DATABASE_ERROR');
  }
};

/**
 * 处理验证错误
 */
const handleValidationError = (error: unknown): ValidationError => {
  const errorObj = error as { details?: Array<{ message: string }>; message?: string };
  if (errorObj.details && Array.isArray(errorObj.details)) {
    const message = errorObj.details.map((detail) => detail.message).join(', ');
    return new ValidationError(message);
  }
  return new ValidationError(errorObj.message || '数据验证失败');
};

/**
 * 全局错误处理中间件
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  let appError: AppError;

  // 如果已经是AppError，直接使用
  if (error instanceof AppError) {
    appError = error;
  }
  // 处理Prisma错误
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = handlePrismaError(error);
  }
  // 处理Prisma验证错误
  else if (error instanceof Prisma.PrismaClientValidationError) {
    appError = new ValidationError('数据验证失败');
  }
  // 处理JSON解析错误
  else if (error instanceof SyntaxError && 'body' in error) {
    appError = new ValidationError('请求数据格式错误');
  }
  // 处理其他验证错误
  else if (error.name === 'ValidationError') {
    appError = handleValidationError(error);
  }
  // 处理JWT错误
  else if (error.name === 'JsonWebTokenError') {
    appError = new AuthenticationError('访问令牌无效');
  }
  else if (error.name === 'TokenExpiredError') {
    appError = new AuthenticationError('访问令牌已过期');
  }
  // 处理Multer错误
  else if (error.name === 'MulterError') {
    const multerError = error as Error & { code: string };
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE': {
        appError = new ValidationError('文件大小超出限制');
        break;
      }
      case 'LIMIT_FILE_COUNT': {
        appError = new ValidationError('文件数量超出限制');
        break;
      }
      case 'LIMIT_UNEXPECTED_FILE': {
        appError = new ValidationError('不支持的文件字段');
        break;
      }
      default: {
        appError = new ValidationError('文件上传失败');
      }
    }
  }
  // 处理未知错误
  else {
    console.error('Unhandled error:', error);
    appError = new AppError('服务器内部错误', 500, 'INTERNAL_ERROR');
  }

  // 记录错误日志
  if (appError.statusCode >= 500) {
    console.error('Server Error:', {
      message: appError.message,
      stack: appError.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  } else {
    console.warn('Client Error:', {
      message: appError.message,
      code: appError.code,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  }

  // 构建错误响应
  const errorResponse: {
    success: boolean;
    error: string;
    code?: string;
    timestamp: string;
    stack?: string;
    field?: string;
    value?: unknown;
  } = {
    success: false,
    error: appError.message,
    code: appError.code,
    timestamp: new Date().toISOString()
  };

  // 在开发环境中包含更多错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = appError.stack;
    if (appError instanceof ValidationError) {
      if (appError.field) {
        errorResponse.field = appError.field;
      }
      if (appError.value !== undefined) {
        errorResponse.value = appError.value;
      }
    }
  }

  // 发送错误响应
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * 异步错误处理包装器
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404错误处理
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`路径 ${req.originalUrl} 未找到`);
  next(error);
};