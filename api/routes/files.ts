import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { requireAdmin } from '../middleware/auth.js';
import { FileCategory } from '../../src/utils/fileTypeUtils';


const router = Router();

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// 配置multer存储
const storage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的文件类型
  const allowedTypes = [
    // 图片类型
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    // 视频类型
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo', // .avi
    'video/x-ms-wmv',  // .wmv
    'video/webm',
    'video/3gpp',      // .3gp
    'video/x-flv',     // .flv
    // 音频类型
    'audio/mpeg',      // .mp3
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',       // .m4a
    'audio/aac',
    // 文档类型
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`不支持的文件类型: ${file.mimetype}`));
  }
};

// 配置multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10), // 默认5GB
    files: parseInt(process.env.MAX_FILES_COUNT || '5', 10) // 默认最多5个文件
  }
});

/**
 * 生成安全的文件名
 */
const generateSafeFileName = (originalName: string): string => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const safeName = baseName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  return `${safeName}_${timestamp}_${uuid}${ext}`;
};

// 文件分类功能已移除，因为数据库模型中不包含category字段

// Multer错误处理中间件
const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE': {
        const maxSizeBytes = parseInt(process.env.MAX_FILE_SIZE || '5368709120');
        const maxSizeGB = (maxSizeBytes / (1024 * 1024 * 1024)).toFixed(1);
        return res.status(400).json({
          success: false,
          error: `文件大小超过限制，最大允许 ${maxSizeGB}GB`
        });
      }
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: '文件数量超过限制'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: '意外的文件字段'
        });
      default:
        return res.status(400).json({
          success: false,
          error: '文件上传错误: ' + err.message
        });
    }
  }
  
  // 其他错误继续传递
  next(err);
};

/**
 * 上传文件
 * POST /api/files/upload
 */
router.post('/upload', upload.single('file'), handleMulterError, asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const file = req.file as Express.Multer.File;
  
  if (!file) {
    throw new ValidationError('请选择要上传的文件');
  }

  // 检查文件大小
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '5368709120', 10);
  if (file.size > maxFileSize) {
    throw new ValidationError(`文件大小超过限制，最大允许 ${Math.round(maxFileSize / (1024 * 1024 * 1024))}GB`);
  }

  await ensureUploadDir();

  try {
    // 获取上传参数
    const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
    // 标签功能已移除

    // 生成安全的文件名
    const safeFileName = generateSafeFileName(file.originalname);
    const filePath = path.join(uploadDir, safeFileName);
    
    // 检查上传目录是否可访问
    try {
      const stats = await fs.stat(uploadDir);
      if (!stats.isDirectory()) {
        throw new Error('上传目录不是有效的目录');
      }
    } catch (error) {
      console.error('上传目录检查失败:', error);
      throw new Error('服务器存储配置错误');
    }

    // 保存文件到磁盘
    try {
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      console.error('文件写入失败:', error);
      throw new ValidationError('文件保存失败，请检查服务器存储空间');
    }
    
    // 保存文件信息到数据库
    const fileRecord = await prisma.file.create({
      data: {
        originalName: file.originalname,
        filename: safeFileName,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        filePath: filePath,
        storageType: 'LOCAL',
        uploadedBy: req.user.id,
        isPublic: isPublic
      },
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        isPublic: true,
        createdAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // 转换BigInt为字符串以便JSON序列化
    const responseFile = {
      ...fileRecord,
      fileSize: fileRecord.fileSize.toString()
    };

    res.status(201).json({
      success: true,
      message: '文件上传成功',
      data: responseFile
    });
  } catch (error) {
    console.error(`文件上传失败: ${file.originalname}`, error);
    throw new ValidationError(error instanceof Error ? error.message : '文件上传失败');
  }
}));

/**
 * 获取文件列表
 * GET /api/files
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const {
    page = '1',
    limit = '20',
    search = '',
    mimeType = '',
    category = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    onlyMine = 'false'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  // 构建查询条件
  const where: {
    OR?: Array<{ isPublic: boolean } | { uploadedBy: string }>;
    originalName?: { contains: string; mode: 'insensitive' };
    mimeType?: string | { in: string[] };
  } = {};

  // 非管理员只能看到公开文件和自己的文件
  if (req.user.role === 'USER' || onlyMine === 'true') {
    where.OR = [
      { isPublic: true },
      { uploadedBy: req.user.id }
    ];
  }

  if (search) {
    where.originalName = {
      contains: search as string,
      mode: 'insensitive'
    };
  }

  // category字段已移除

  if (mimeType) {
    where.mimeType = mimeType as string;
  }

  // 按文件类别筛选
  if (category) {
    const categoryType = category as string;
    if (categoryType === FileCategory.IMAGE) {
      // 筛选图片文件
      where.mimeType = {
        in: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/ico', 'image/x-icon']
      };
    } else if (categoryType === FileCategory.VIDEO) {
      // 筛选视频文件
      where.mimeType = {
        in: ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/mkv', 'video/x-msvideo', 'video/webm', 'video/ogg', 'video/3gpp', 'video/x-flv', 'video/x-ms-wmv']
      };
    }
  }

  // 构建排序条件
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  const validSortFields = ['createdAt', 'updatedAt', 'originalName', 'fileSize'];
  if (validSortFields.includes(sortBy as string)) {
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    }),
    prisma.file.count({ where })
  ]);

  console.log('🖼️ [DEBUG] 图片文件查询结果:', {
    totalFiles: total,
    returnedFiles: files.length,
    fileDetails: files.map(f => ({ id: f.id, name: f.originalName, mimeType: f.mimeType }))
  });

  // 转换BigInt字段为字符串以避免JSON序列化错误
  const serializedFiles = files.map(file => ({
    ...file,
    fileSize: file.fileSize.toString()
  }));

  res.json({
    success: true,
    data: {
      files: serializedFiles,
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
 * 获取图片文件列表
 * GET /api/files/images
 */
router.get('/images', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  console.log('🖼️ [DEBUG] 获取图片文件列表请求:', {
    userId: req.user.id,
    query: req.query
  });

  const {
    page = '1',
    limit = '20',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    onlyMine = 'false'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  // 构建查询条件
  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/ico', 'image/x-icon'];
  const where: {
    OR?: Array<{ isPublic: boolean } | { uploadedBy: string }>;
    originalName?: { contains: string; mode: 'insensitive' };
    mimeType: { in: string[] };
  } = {
    mimeType: {
      in: imageMimeTypes
    }
  };

  console.log('🖼️ [DEBUG] 图片文件筛选条件:', {
    mimeTypes: imageMimeTypes,
    whereCondition: where
  });

  // 非管理员只能看到公开文件和自己的文件
  if (req.user.role === 'USER' || onlyMine === 'true') {
    where.OR = [
      { isPublic: true },
      { uploadedBy: req.user.id }
    ];
  }

  if (search) {
    where.originalName = {
      contains: search as string,
      mode: 'insensitive'
    };
  }

  // 构建排序条件
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  const validSortFields = ['createdAt', 'updatedAt', 'originalName', 'fileSize'];
  if (validSortFields.includes(sortBy as string)) {
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    }),
    prisma.file.count({ where })
  ]);

  console.log('📷 [DEBUG] 图片文件查询结果:', {
    totalFiles: total,
    returnedFiles: files.length,
    fileDetails: files.map(f => ({ id: f.id, name: f.originalName, mimeType: f.mimeType }))
  });

  // 转换BigInt字段为字符串以避免JSON序列化错误
  const serializedFiles = files.map(file => ({
    ...file,
    fileSize: file.fileSize.toString()
  }));

  res.json({
    success: true,
    data: {
      files: serializedFiles,
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
 * 获取视频文件列表
 * GET /api/files/videos
 */
router.get('/videos', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  console.log('🎥 [DEBUG] 获取视频文件列表请求:', {
    userId: req.user.id,
    query: req.query
  });

  const {
    page = '1',
    limit = '20',
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    onlyMine = 'false'
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  // 构建查询条件
  const videoMimeTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/mkv', 'video/x-msvideo', 'video/webm', 'video/ogg', 'video/3gpp', 'video/x-flv', 'video/x-ms-wmv'];
  const where: {
    OR?: Array<{ isPublic: boolean } | { uploadedBy: string }>;
    originalName?: { contains: string; mode: 'insensitive' };
    mimeType: { in: string[] };
  } = {
    mimeType: {
      in: videoMimeTypes
    }
  };

  console.log('🎥 [DEBUG] 视频文件筛选条件:', {
    mimeTypes: videoMimeTypes,
    whereCondition: where
  });

  // 非管理员只能看到公开文件和自己的文件
  if (req.user.role === 'USER' || onlyMine === 'true') {
    where.OR = [
      { isPublic: true },
      { uploadedBy: req.user.id }
    ];
  }

  if (search) {
    where.originalName = {
      contains: search as string,
      mode: 'insensitive'
    };
  }

  // 构建排序条件
  const orderBy: Record<string, 'asc' | 'desc'> = {};
  const validSortFields = ['createdAt', 'updatedAt', 'originalName', 'fileSize'];
  if (validSortFields.includes(sortBy as string)) {
    orderBy[sortBy as string] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy,
      skip,
      take: limitNum
    }),
    prisma.file.count({ where })
  ]);

  console.log('🎥 [DEBUG] 视频文件查询结果:', {
    totalFiles: total,
    returnedFiles: files.length,
    fileDetails: files.map(f => ({ id: f.id, name: f.originalName, mimeType: f.mimeType }))
  });

  // 转换BigInt字段为字符串以避免JSON序列化错误
  const serializedFiles = files.map(file => ({
    ...file,
    fileSize: file.fileSize.toString()
  }));

  res.json({
    success: true,
    data: {
      files: serializedFiles,
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
 * 获取文件详情
 * GET /api/files/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { id } = req.params;

  const file = await prisma.file.findUnique({
    where: { id },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!file) {
    throw new NotFoundError('文件不存在');
  }

  // 权限检查：非管理员只能访问公开文件或自己的文件
  if (req.user.role === 'USER' && !file.isPublic && file.uploadedBy !== req.user.id) {
    throw new NotFoundError('文件不存在');
  }

  // 转换BigInt字段为字符串
  const serializedFile = {
    ...file,
    fileSize: file.fileSize.toString()
  };

  res.json({
    success: true,
    data: { file: serializedFile }
  });
}));

/**
 * 下载文件
 * GET /api/files/:id/download
 */
router.get('/:id/download', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { id } = req.params;

  const file = await prisma.file.findUnique({
    where: { id }
  });

  if (!file) {
    throw new NotFoundError('文件不存在');
  }

  // 权限检查
  if (req.user.role === 'USER' && !file.isPublic && file.uploadedBy !== req.user.id) {
    throw new NotFoundError('文件不存在');
  }

  try {
    // 检查文件是否存在于磁盘
    await fs.access(file.filePath);
    
    // 设置响应头
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);;
    res.setHeader('Content-Length', file.fileSize.toString());

    // 发送文件
    res.sendFile(path.resolve(file.filePath));
  } catch (error) {
    console.error('文件下载失败:', error);
    throw new NotFoundError('文件不存在或已损坏');
  }
}));

/**
 * 更新文件信息
 * PUT /api/files/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { id } = req.params;
  const { originalName, isPublic } = req.body;

  const file = await prisma.file.findUnique({
    where: { id },
    select: {
      id: true,
      uploadedBy: true,
      originalName: true,
      isPublic: true
    }
  });

  if (!file) {
    throw new NotFoundError('文件不存在');
  }

  // 权限检查：只有文件上传者或管理员可以修改
  if (file.uploadedBy !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    throw new ValidationError('权限不足');
  }

  const updateData: {
    updatedAt: Date;
    originalName?: string;
    isPublic?: boolean;
  } = {
    updatedAt: new Date()
  };

  if (originalName !== undefined) {
    if (!originalName || originalName.trim().length === 0) {
      throw new ValidationError('文件名不能为空');
    }
    updateData.originalName = originalName.trim();
  }

  if (isPublic !== undefined) {
    updateData.isPublic = Boolean(isPublic);
  }

  const updatedFile = await prisma.file.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      originalName: true,
      filename: true,
      mimeType: true,
      fileSize: true,
      isPublic: true,
      updatedAt: true,
      uploader: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // 转换BigInt字段为字符串
  const serializedUpdatedFile = {
    ...updatedFile,
    fileSize: updatedFile.fileSize.toString()
  };

  res.json({
    success: true,
    message: '文件信息更新成功',
    data: { file: serializedUpdatedFile }
  });
}));

/**
 * 删除文件
 * DELETE /api/files/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  const { id } = req.params;

  const file = await prisma.file.findUnique({
    where: { id },
    select: {
      id: true,
      filePath: true,
      uploadedBy: true,
      originalName: true
    }
  });

  if (!file) {
    throw new NotFoundError('文件不存在');
  }

  // 权限检查：只有文件上传者或管理员可以删除
  if (file.uploadedBy !== req.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
    throw new ValidationError('权限不足');
  }

  try {
    // 删除磁盘文件
    await fs.unlink(file.filePath);
  } catch (error) {
    console.warn('删除磁盘文件失败:', error);
    // 继续删除数据库记录，即使磁盘文件删除失败
  }

  // 删除数据库记录
  await prisma.file.delete({
    where: { id }
  });

  res.json({
    success: true,
    message: '文件删除成功'
  });
}));

/**
 * 批量删除文件（管理员权限）
 * DELETE /api/files/batch
 */
router.delete('/batch', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { fileIds } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    throw new ValidationError('请提供要删除的文件ID列表');
  }

  if (fileIds.length > 100) {
    throw new ValidationError('一次最多删除100个文件');
  }

  const files = await prisma.file.findMany({
    where: {
      id: {
        in: fileIds
      }
    },
    select: {
      id: true,
      filePath: true,
      originalName: true
    }
  });

  const deletedFiles = [];
  const errors = [];

  for (const file of files) {
    try {
      // 删除磁盘文件
      await fs.unlink(file.filePath);
      deletedFiles.push(file.id);
    } catch (error) {
      console.warn(`删除磁盘文件失败: ${file.originalName}`, error);
      // 即使磁盘文件删除失败，也继续删除数据库记录
      deletedFiles.push(file.id);
    }
  }

  // 批量删除数据库记录
  const deleteResult = await prisma.file.deleteMany({
    where: {
      id: {
        in: deletedFiles
      }
    }
  });

  res.json({
    success: true,
    message: `成功删除 ${deleteResult.count} 个文件`,
    data: {
      deletedCount: deleteResult.count,
      errors: errors.length > 0 ? errors : undefined
    }
  });
}));

/**
 * 验证文件物理存在性并清理孤立记录
 * POST /api/files/validate-and-cleanup
 */
router.post('/validate-and-cleanup', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ValidationError('用户未认证');
  }

  // 获取所有文件记录
  const allFiles = await prisma.file.findMany({
    select: {
      id: true,
      filePath: true,
      originalName: true,
      uploadedBy: true
    }
  });

  const orphanedFiles = [];
  const validFiles = [];

  // 检查每个文件的物理存在性
  for (const file of allFiles) {
    try {
      await fs.access(file.filePath);
      validFiles.push(file.id);
    } catch {
      // 文件不存在，标记为孤立记录
      orphanedFiles.push({
        id: file.id,
        originalName: file.originalName,
        filePath: file.filePath
      });
    }
  }

  // 删除孤立记录
  let deletedCount = 0;
  if (orphanedFiles.length > 0) {
    const deleteResult = await prisma.file.deleteMany({
      where: {
        id: {
          in: orphanedFiles.map(f => f.id)
        }
      }
    });
    deletedCount = deleteResult.count;
  }

  res.json({
    success: true,
    message: `文件验证完成，清理了 ${deletedCount} 个孤立记录`,
    data: {
      totalFiles: allFiles.length,
      validFiles: validFiles.length,
      orphanedFiles: orphanedFiles.length,
      deletedCount,
      orphanedList: orphanedFiles.map(f => ({
        id: f.id,
        originalName: f.originalName,
        filePath: f.filePath
      }))
    }
  });
}));

/**
 * 获取文件统计信息
 * GET /api/files/stats/overview
 */
router.get('/stats/overview', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const [totalFiles, totalSize, recentFiles] = await Promise.all([
    prisma.file.count(),
    prisma.file.aggregate({
      _sum: {
        fileSize: true
      }
    }),
    prisma.file.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
        }
      }
    })
  ]);

  // 简单的文件类型分布统计
  const categoryDistribution = {};

  res.json({
    success: true,
    data: {
      totalFiles,
      totalSize: totalSize._sum.fileSize || 0,
      recentFiles,
      categoryDistribution
    }
  });
}));

export default router;