import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Trash2,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  HardDrive,
  Globe,
  Lock,
  Files as FilesIcon,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import ImageUploadModal from '../components/ImageUploadModal';
import VideoUploadModal from '../components/VideoUploadModal';
import { useFiles, FileFilters } from '../hooks/useFiles';

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('text') || mimeType.includes('document')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return Archive;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

type TabType = 'images' | 'videos';

const Files: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('images');
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  const {
    files,
    loading,
    totalFiles,
    deleteFile,
    fetchImageFiles,
    fetchVideoFiles,
    uploadFile
  } = useFiles();

  const [localFilters, setLocalFilters] = useState<FileFilters>({
    search: '',
    mimeType: '',
    storageType: undefined,
    isPublic: undefined
  });

  // 根据当前标签页加载对应的文件
  useEffect(() => {
    console.log('📋 [DEBUG] Files useEffect 触发:', { activeTab });
    if (activeTab === 'images') {
      console.log('📋 [DEBUG] 调用 fetchImageFiles');
      fetchImageFiles();
    } else if (activeTab === 'videos') {
      console.log('📋 [DEBUG] 调用 fetchVideoFiles');
      fetchVideoFiles();
    }
  }, [activeTab, fetchImageFiles, fetchVideoFiles]);

  // 处理标签页切换
  const handleTabChange = (tab: TabType) => {
    console.log('📋 [DEBUG] 标签页切换:', { from: activeTab, to: tab });
    setActiveTab(tab);
    setSelectedFiles(new Set()); // 清空选择
    setSearchTerm(''); // 清空搜索
    setShowFilters(false); // 关闭筛选
  };

  // 处理文件上传
  const handleFileUpload = async (files: File[], onProgress?: (progress: number) => void) => {
    for (const file of files) {
      await uploadFile(file, true, [], onProgress); // isPublic=true, tags=[], onProgress
    }
  };

  // 刷新当前标签页的文件列表
  const refreshCurrentTab = () => {
    if (activeTab === 'images') {
      fetchImageFiles();
    } else if (activeTab === 'videos') {
      fetchVideoFiles();
    }
  };

  // 处理搜索
  const handleSearch = () => {
    // TODO: 实现搜索功能
    console.log('搜索:', searchTerm);
  };

  // 处理筛选
  const handleFilterChange = (key: keyof FileFilters, value: string | boolean | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    // TODO: 实现筛选功能
    console.log('筛选:', newFilters);
  };

  // 处理文件选择
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？`)) {
      try {
        for (const fileId of selectedFiles) {
          await deleteFile(fileId);
        }
        setSelectedFiles(new Set());
      } catch (error) {
        console.error('批量删除失败:', error);
      }
    }
  };

  // 处理单个文件删除
  const handleDeleteFile = async (fileId: string, filename: string) => {
    console.log('🔍 [DEBUG] handleDeleteFile 被调用:', { fileId, filename });
    
    // 测试toast功能
    console.log('🔍 [DEBUG] 测试toast功能');
    toast.info('测试toast功能正常');
    
    const confirmResult = confirm(`确定要删除文件 "${filename}" 吗？`);
    console.log('🔍 [DEBUG] 用户确认结果:', confirmResult);
    
    if (confirmResult) {
      try {
        console.log('🔍 [DEBUG] 开始删除文件流程');
        
        // 显示加载状态
        const loadingToast = toast.loading('正在删除文件...');
        console.log('🔍 [DEBUG] 显示加载提示');
        
        await deleteFile(fileId);
        console.log('🔍 [DEBUG] deleteFile 调用完成');
        
        // 关闭加载提示
        toast.dismiss(loadingToast);
        console.log('🔍 [DEBUG] 关闭加载提示');
        
        // 刷新文件列表以确保同步
        refreshCurrentTab();
        console.log('🔍 [DEBUG] 文件列表刷新完成');
        
      } catch (error) {
        console.error('🔍 [DEBUG] 删除文件失败:', error);
        // 错误处理已在deleteFile中完成
      }
    } else {
      console.log('🔍 [DEBUG] 用户取消删除操作');
    }
  };

  // 处理文件下载
  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      // TODO: 实现文件下载功能
      console.log('下载文件:', fileId, filename);
    } catch (error) {
      console.error('下载文件失败:', error);
    }
  };

  // 计算分页信息
  const pageSize = 20; // 固定页面大小
  const currentPage = 1; // 固定当前页
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalFiles);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            文件管理
          </h2>
          <p className="text-gray-600">
            按类型管理系统文件，支持图片和视频文件的分类上传和管理。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedFiles.size > 0 && (
            <Button 
              variant="outline" 
              onClick={handleBatchDelete}
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              删除选中 ({selectedFiles.size})
            </Button>
          )}
          {activeTab === 'images' && (
            <Button 
              variant="primary" 
              onClick={() => setShowImageUploadModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Image className="w-4 h-4" />
              上传图片
            </Button>
          )}
          {activeTab === 'videos' && (
            <Button 
              variant="primary" 
              onClick={() => setShowVideoUploadModal(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Video className="w-4 h-4" />
              上传视频
            </Button>
          )}
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('images')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'images'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              图片文件管理
            </div>
          </button>
          <button
            onClick={() => handleTabChange('videos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'videos'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              视频文件管理
            </div>
          </button>
        </nav>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="搜索文件名..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button 
                variant="primary" 
                onClick={handleSearch}
                className="px-6"
              >
                搜索
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                筛选
              </Button>
            </div>

            {/* 筛选选项 */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 pt-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        文件类型
                      </label>
                      <select
                        value={localFilters.mimeType || ''}
                        onChange={(e) => handleFilterChange('mimeType', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">全部类型</option>
                        <option value="image/">图片</option>
                        <option value="video/">视频</option>
                        <option value="audio/">音频</option>
                        <option value="text/">文档</option>
                        <option value="application/">应用程序</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        存储类型
                      </label>
                      <select
                        value={localFilters.storageType || ''}
                        onChange={(e) => handleFilterChange('storageType', e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">全部存储</option>
                        <option value="LOCAL">本地存储</option>
                        <option value="CLOUD">云存储</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        访问权限
                      </label>
                      <select
                        value={localFilters.isPublic === undefined ? '' : String(localFilters.isPublic)}
                        onChange={(e) => handleFilterChange('isPublic', e.target.value === '' ? undefined : e.target.value === 'true')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">全部权限</option>
                        <option value="true">公开</option>
                        <option value="false">私有</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* 文件列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab === 'images' ? (
                <>
                  <Image className="w-5 h-5 text-blue-600" />
                  图片文件列表
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 text-purple-600" />
                  视频文件列表
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  refreshCurrentTab();
                  // 同时重置本地筛选状态
                  setLocalFilters({
                    search: '',
                    mimeType: '',
                    storageType: undefined,
                    isPublic: undefined
                  });
                  setSearchTerm('');
                }}
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="刷新文件列表"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
              {totalFiles > 0 && (
                <span className="text-sm text-gray-500">
                  共 {totalFiles} 个文件
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">加载中...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FilesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {Object.values(localFilters).some(v => v) ? '未找到匹配的文件' : `暂无${activeTab === 'images' ? '图片' : '视频'}文件`}
              </h3>
              <p className="text-gray-600">
                {Object.values(localFilters).some(v => v) ? '请尝试调整搜索条件' : `点击上传按钮开始上传${activeTab === 'images' ? '图片' : '视频'}文件`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 文件表格 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedFiles.size === files.length && files.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFiles(new Set(files.map(f => f.id)));
                            } else {
                              setSelectedFiles(new Set());
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">文件名</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">大小</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">类型</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">权限</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">存储</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">上传时间</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">下载次数</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => {
                      const FileIcon = getFileIcon(file.mimeType);
                      return (
                        <motion.tr
                          key={file.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.id)}
                              onChange={() => toggleFileSelection(file.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.originalName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  上传者: {file.uploader.name}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatFileSize(parseInt(file.fileSize))}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {file.mimeType.split('/')[0]}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              {file.isPublic ? (
                                <Globe className="w-4 h-4 text-green-500" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="text-sm text-gray-600">
                                {file.isPublic ? '公开' : '私有'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <HardDrive className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-gray-600">
                                本地
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(file.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            -
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadFile(file.id, file.originalName)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="下载"
                              >
                                <Download className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  console.log('🔍 [DEBUG] 删除按钮被点击:', { fileId: file.id, fileName: file.originalName });
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteFile(file.id, file.originalName);
                                }}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页信息 */}
              <div className="flex items-center justify-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  显示 {startItem}-{endItem} 项，共 {totalFiles} 项
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 图片上传模态框 */}
      <ImageUploadModal
        isOpen={showImageUploadModal}
        onClose={() => setShowImageUploadModal(false)}
        onUploadSuccess={() => {
          // 延迟刷新确保上传完成，并强制清除缓存
          setTimeout(() => {
            fetchImageFiles();
          }, 500);
        }}
        onUpload={handleFileUpload}
      />

      {/* 视频上传模态框 */}
      <VideoUploadModal
        isOpen={showVideoUploadModal}
        onClose={() => setShowVideoUploadModal(false)}
        onUploadSuccess={() => {
          // 延迟刷新确保上传完成，并强制清除缓存
          setTimeout(() => {
            fetchVideoFiles();
          }, 500);
        }}
        onUpload={handleFileUpload}
      />
    </motion.div>
  );
};

export default Files;