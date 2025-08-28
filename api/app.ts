/**
 * 可视化后台服务器管理系统 - API服务器
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// 扩展Request接口
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    rawBody?: Buffer;
  }
}

// 路由导入
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import fileRoutes from './routes/files.js';
import systemRoutes from './routes/system.js';

// 中间件导入
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config();

const app: express.Application = express();

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 配置速率限制器
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 1000, // 每个IP每15分钟最多1000次请求
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 为文件相关操作提供更宽松的限制
  skip: (req) => {
    // 跳过文件相关请求的限制
    return req.path.startsWith('/api/files');
  }
});

// 应用速率限制
app.use(limiter);

// 添加请求日志中间件
app.use('/api', (req, res, next) => {
  console.log(`请求: ${req.method} ${req.path}`);
  next();
});

console.log('速率限制已重新配置：1000次/15分钟，文件操作不受限制');

// 请求ID中间件
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  next();
});

// 请求日志中间件
app.use(requestLogger);

// 基础中间件
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb',
  verify: (req: Request, res: Response, buf: Buffer) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_FILE_SIZE || '10mb' 
}));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * API Routes
 */
// 公开路由（无需认证）
app.use('/api/auth', authRoutes);

// 需要认证的路由
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/system', authMiddleware, systemRoutes);

/**
 * 健康检查
 */
app.get('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * API信息
 */
app.get('/api', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: '可视化后台服务器管理系统 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      files: '/api/files',
      system: '/api/system',
      health: '/api/health'
    }
  });
});

/**
 * 404 处理
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

/**
 * 全局错误处理中间件
 */
app.use(errorHandler);

export default app;