import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { TokenManager } from '../utils/api';
import { FileCategory } from '../utils/fileTypeUtils';

export interface FileItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: string; // 后端返回的是字符串格式的BigInt
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
  };
}



export interface FileFilters {
  search?: string;
  mimeType?: string;
  storageType?: 'LOCAL' | 'CLOUD';
  isPublic?: boolean;
  uploadedBy?: string;
  category?: FileCategory;
}

export const useFiles = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FileFilters>({});
  const [totalFiles, setTotalFiles] = useState(0);
  
  // 验证文件并清理孤立记录
  const validateAndCleanupFiles = useCallback(async () => {
    const token = TokenManager.getAccessToken();
    if (!token) return { deletedCount: 0 };
    
    try {
      const response = await fetch('/api/files/validate-and-cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('文件验证失败');
      }
      
      const result = await response.json();
      
      // 如果有孤立记录被清理，显示提示
      if (result.data.deletedCount > 0) {
        toast.info(`已清理 ${result.data.deletedCount} 个无效文件记录`);
      }
      
      return result.data;
    } catch (error) {
      console.error('文件验证失败:', error);
      return { deletedCount: 0 };
    }
  }, []);
  
  // 获取文件列表
  const fetchFiles = useCallback(async (page = 1, limit = 20, searchFilters = filters, skipValidation = false) => {
    const token = TokenManager.getAccessToken();
    if (!token) return;
    
    setLoading(true);
    try {
      // 在获取文件列表前先验证和清理孤立记录（除非明确跳过）
      if (!skipValidation) {
        await validateAndCleanupFiles();
      }
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(searchFilters).filter(([, value]) => value !== undefined && value !== '')
        ),
        ...(searchFilters.category && { category: searchFilters.category })
      });
      
      const response = await fetch(`/api/files?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取文件列表失败');
      }
      
      const data = await response.json();
      console.log('API响应数据:', data); // 调试日志
      
      // 后端返回格式: {success: true, data: {files: [...], pagination: {...}}}
      const responseData = data.data || data;
      setFiles(responseData.files || []);
      setTotalFiles(responseData.pagination?.total || responseData.total || 0);
    } catch (error) {
      console.error('获取文件列表失败:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [filters, validateAndCleanupFiles]);

  const uploadFile = async (file: File, isPublic: boolean, tags: string[], onProgress?: (progress: number) => void, retryCount = 0) => {
    const maxRetries = 2;
    
    return new Promise((resolve, reject) => {
      const token = TokenManager.getAccessToken();
      if (!token) {
        reject(new Error('用户未登录'));
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPublic', isPublic.toString());
      formData.append('tags', JSON.stringify(tags));

      const xhr = new XMLHttpRequest();
      
      // 设置超时时间为5分钟
      xhr.timeout = 300000;
      
      // 上传进度监听
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          console.log(`文件 ${file.name} 上传进度: ${progress}%`);
          onProgress?.(progress);
        }
      });
      
      // 请求完成监听
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            
            // 强制刷新文件列表，避免缓存问题，跳过验证以避免频繁请求
            setTimeout(() => {
              fetchFiles(1, 20, filters, true); // skipValidation = true
            }, 500);
            
            resolve(result);
          } catch {
            reject(new Error('响应解析失败'));
          }
        } else {
          let errorMessage = '上传失败';
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.message || errorData.error || `HTTP ${xhr.status}: ${xhr.statusText}`;
          } catch {
            errorMessage = `HTTP ${xhr.status}: ${xhr.statusText}`;
          }
          reject(new Error(errorMessage));
        }
      });
      
      // 错误监听
      xhr.addEventListener('error', () => {
        console.error('文件上传失败:', xhr.statusText);
        
        // 网络错误重试逻辑
        if (retryCount < maxRetries) {
          console.log(`重试上传文件 ${file.name}，第 ${retryCount + 1} 次重试`);
          setTimeout(() => {
            uploadFile(file, isPublic, tags, onProgress, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // 递增延迟
        } else {
          reject(new Error('网络连接失败'));
        }
      });
      
      // 超时监听
      xhr.addEventListener('timeout', () => {
        reject(new Error('上传超时，请检查网络连接'));
      });
      
      // 中止监听
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'));
      });
      
      // 发送请求
      xhr.open('POST', '/api/files/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  };

  // 删除文件
  const deleteFile = useCallback(async (fileId: string) => {
    console.log('🔍 [DEBUG] deleteFile 函数被调用:', { fileId });
    
    const token = TokenManager.getAccessToken();
    console.log('🔍 [DEBUG] 获取token:', token ? '存在' : '不存在');
    
    if (!token) {
      console.log('🔍 [DEBUG] token不存在，抛出错误');
      throw new Error('未登录');
    }
    
    try {
      console.log('🔍 [DEBUG] 开始发送DELETE请求');
      
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🔍 [DEBUG] DELETE请求响应:', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        console.log('🔍 [DEBUG] 响应不成功，解析错误信息');
        const errorData = await response.json().catch(() => ({}));
        console.log('🔍 [DEBUG] 错误数据:', errorData);
        throw new Error(errorData.message || errorData.error || '删除文件失败');
      }
      
      const result = await response.json();
      console.log('🔍 [DEBUG] 删除成功，响应数据:', result);
      
      // 更新本地状态
      console.log('🔍 [DEBUG] 更新本地状态');
      setFiles(prev => {
        const newFiles = prev.filter(file => file.id !== fileId);
        console.log('🔍 [DEBUG] 过滤后的文件列表长度:', newFiles.length);
        return newFiles;
      });
      setTotalFiles(prev => {
        const newTotal = prev - 1;
        console.log('🔍 [DEBUG] 更新总文件数:', newTotal);
        return newTotal;
      });
      
      // 显示成功提示
      const successMessage = result.message || '文件删除成功';
      console.log('🔍 [DEBUG] 显示成功提示:', successMessage);
      toast.success(successMessage);
      
      return result;
    } catch (error) {
      console.error('🔍 [DEBUG] 删除文件失败:', error);
      
      // 显示错误提示
      const errorMessage = error instanceof Error ? error.message : '删除文件失败';
      console.log('🔍 [DEBUG] 显示错误提示:', errorMessage);
      toast.error(errorMessage);
      
      throw error;
    }
  }, []);



  // 更新文件信息
  const updateFile = useCallback(async (fileId: string, updateData: Partial<Pick<FileItem, 'isPublic' | 'originalName'>>) => {
    const token = TokenManager.getAccessToken();
    if (!token) throw new Error('未登录');
    
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('更新文件失败');
      }
      
      const updatedFile = await response.json();
      setFiles(prev => prev.map(file => 
        file.id === fileId ? updatedFile : file
      ));
      
      return updatedFile;
    } catch (error) {
      console.error('更新文件失败:', error);
      throw error;
    }
  }, []);



  // 注释掉自动初始化加载，让页面组件控制何时加载文件
  // useEffect(() => {
  //   if (TokenManager.getAccessToken()) {
  //     fetchFiles();
  //   }
  // }, [fetchFiles]);

  // 获取图片文件列表
  const fetchImageFiles = useCallback(async (page = 1, limit = 20, search?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        _t: Date.now().toString() // 添加时间戳防止缓存
      });

      const response = await fetch(`/api/files/images?${params}`, {
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setFiles(data.data.files);
        setTotalFiles(data.data.pagination.total);
      } else {
        throw new Error(data.message || '获取图片文件列表失败');
      }
    } catch (error) {
      console.error('获取图片文件列表失败:', error);
      toast.error('获取图片文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取视频文件列表
  const fetchVideoFiles = useCallback(async (page = 1, limit = 20, search?: string) => {
    console.log('🎬 [DEBUG] fetchVideoFiles 被调用:', { page, limit, search });
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        _t: Date.now().toString() // 添加时间戳防止缓存
      });

      console.log('🎬 [DEBUG] 发送视频API请求:', `/api/files/videos?${params}`);
      const response = await fetch(`/api/files/videos?${params}`, {
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setFiles(data.data.files);
        setTotalFiles(data.data.pagination.total);
      } else {
        throw new Error(data.message || '获取视频文件列表失败');
      }
    } catch (error) {
      console.error('获取视频文件列表失败:', error);
      toast.error('获取视频文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    files,
    loading,
    totalFiles,
    filters,
    setFilters,
    fetchFiles,
    fetchImageFiles,
    fetchVideoFiles,
    uploadFile,
    deleteFile,
    updateFile,
    validateAndCleanupFiles
  };
};