/**
 * 前端文件类型分类工具函数
 * 用于识别和分类图片、视频等文件类型
 */

// 图片文件MIME类型
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/ico',
  'image/x-icon'
] as const;

// 视频文件MIME类型
export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/quicktime',
  'video/mkv',
  'video/x-msvideo',
  'video/webm',
  'video/ogg',
  'video/3gpp',
  'video/x-flv',
  'video/x-ms-wmv'
] as const;

// 图片文件扩展名
export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tiff',
  '.tif',
  '.svg',
  '.ico'
] as const;

// 视频文件扩展名
export const VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.webm',
  '.ogg',
  '.3gp',
  '.flv',
  '.wmv',
  '.m4v'
] as const;

// 文件类型枚举
export enum FileCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  OTHER = 'other'
}

/**
 * 根据MIME类型判断文件类别
 * @param mimeType 文件的MIME类型
 * @returns 文件类别
 */
export function getFileCategoryByMimeType(mimeType: string): FileCategory {
  if (!mimeType) {
    return FileCategory.OTHER;
  }

  const normalizedMimeType = mimeType.toLowerCase();

  if ((IMAGE_MIME_TYPES as readonly string[]).includes(normalizedMimeType)) {
    return FileCategory.IMAGE;
  }

  if ((VIDEO_MIME_TYPES as readonly string[]).includes(normalizedMimeType)) {
    return FileCategory.VIDEO;
  }

  return FileCategory.OTHER;
}

/**
 * 根据文件扩展名判断文件类别
 * @param filename 文件名
 * @returns 文件类别
 */
export function getFileCategoryByExtension(filename: string): FileCategory {
  if (!filename) {
    return FileCategory.OTHER;
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  if ((IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    return FileCategory.IMAGE;
  }

  if ((VIDEO_EXTENSIONS as readonly string[]).includes(extension)) {
    return FileCategory.VIDEO;
  }

  return FileCategory.OTHER;
}

/**
 * 综合判断文件类别（优先使用MIME类型，备用扩展名）
 * @param mimeType 文件的MIME类型
 * @param filename 文件名
 * @returns 文件类别
 */
export function getFileCategory(mimeType?: string, filename?: string): FileCategory {
  // 优先使用MIME类型判断
  if (mimeType) {
    const categoryByMime = getFileCategoryByMimeType(mimeType);
    if (categoryByMime !== FileCategory.OTHER) {
      return categoryByMime;
    }
  }

  // 备用扩展名判断
  if (filename) {
    return getFileCategoryByExtension(filename);
  }

  return FileCategory.OTHER;
}

/**
 * 检查是否为图片文件
 * @param mimeType 文件的MIME类型
 * @param filename 文件名
 * @returns 是否为图片文件
 */
export const isImageFile = (file: File): boolean => {
  return getFileCategory(file.type, file.name) === FileCategory.IMAGE;
}

/**
 * 检查是否为视频文件
 * @param mimeType 文件的MIME类型
 * @param filename 文件名
 * @returns 是否为视频文件
 */
export const isVideoFile = (file: File): boolean => {
  return getFileCategory(file.type, file.name) === FileCategory.VIDEO;
}

/**
 * 获取文件类型的显示名称
 * @param category 文件类别
 * @returns 显示名称
 */
export const getFileCategoryDisplayName = (category: FileCategory): string => {
  switch (category) {
    case FileCategory.IMAGE:
      return '图片';
    case FileCategory.VIDEO:
      return '视频';
    default:
      return '其他';
  }
}

/**
 * 获取支持的文件类型描述
 * @param category 文件类别
 * @returns 支持的文件类型描述
 */
export const getSupportedFileTypes = (category: FileCategory): string => {
  switch (category) {
    case FileCategory.IMAGE:
      return 'JPG, PNG, GIF, WebP, BMP, TIFF, SVG, ICO';
    case FileCategory.VIDEO:
      return 'MP4, AVI, MOV, MKV, WebM, OGG, 3GP, FLV, WMV';
    default:
      return '所有文件类型';
  }
}

/**
 * 获取文件上传的accept属性
 * @param category 文件类别
 * @returns accept属性值
 */
export const getFileAcceptTypes = (category: FileCategory): string => {
  switch (category) {
    case FileCategory.IMAGE:
      return 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.svg,.ico';
    case FileCategory.VIDEO:
      return 'video/*,.mp4,.avi,.mov,.mkv,.webm,.ogg,.3gp,.flv,.wmv,.m4v';
    default:
      return '*/*';
  }
}