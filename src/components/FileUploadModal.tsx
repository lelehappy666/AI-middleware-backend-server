import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, File, Image, Video, Music, FileText, Archive } from 'lucide-react';
import { Button } from './ui/Button';
import { useFiles } from '../hooks/useFiles';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

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

  const formatUploadSpeed = (kbps: number): string => {
    if (kbps < 1024) {
      return `${kbps.toFixed(1)} KB/s`;
    } else {
      return `${(kbps / 1024).toFixed(1)} MB/s`;
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}小时${minutes}分钟`;
    }
  };

interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadSpeed?: number; // KB/s
  startTime?: number;
  estimatedTimeRemaining?: number; // seconds
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [tags, setTags] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile } = useFiles();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // 初始化进度状态
      const initialProgress: FileUploadProgress[] = selectedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      }));
      setUploadProgress(initialProgress);
      setOverallProgress(0);
      
      // 逐个上传文件以便跟踪进度
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          const startTime = Date.now();
          let lastProgressTime = startTime;
          let lastProgressBytes = 0;
          
          // 更新当前文件状态为上传中
          setUploadProgress(prev => prev.map((item, index) => 
            index === i ? { ...item, status: 'uploading' as const, progress: 0, startTime } : item
          ));
          
          // 使用真实上传进度
          await uploadFile(
            file, 
            isPublic, 
            tagsArray,
            // 真实进度回调
            (progress: number) => {
              const currentTime = Date.now();
              const currentBytes = (progress / 100) * file.size;
              const timeDiff = (currentTime - lastProgressTime) / 1000; // seconds
              const bytesDiff = currentBytes - lastProgressBytes;
              
              // 计算上传速度 (KB/s)
              let uploadSpeed = 0;
              if (timeDiff > 0) {
                uploadSpeed = (bytesDiff / 1024) / timeDiff;
              }
              
              // 估算剩余时间
              let estimatedTimeRemaining = 0;
              if (uploadSpeed > 0 && progress > 0) {
                const remainingBytes = file.size - currentBytes;
                estimatedTimeRemaining = (remainingBytes / 1024) / uploadSpeed;
              }
              
              setUploadProgress(prev => {
                const updated = prev.map((item, index) => 
                  index === i ? { 
                    ...item, 
                    progress, 
                    uploadSpeed: uploadSpeed > 0 ? uploadSpeed : item.uploadSpeed,
                    estimatedTimeRemaining: estimatedTimeRemaining > 0 ? estimatedTimeRemaining : item.estimatedTimeRemaining
                  } : item
                );
                
                // 计算基于文件大小加权的整体进度
                const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
                const weightedProgress = updated.reduce((sum, item, idx) => {
                  const fileWeight = selectedFiles[idx].size / totalSize;
                  return sum + (item.progress * fileWeight);
                }, 0);
                setOverallProgress(weightedProgress);
                
                return updated;
              });
              
              // 更新上次记录的时间和字节数
              if (timeDiff > 1) { // 每秒更新一次速度计算
                lastProgressTime = currentTime;
                lastProgressBytes = currentBytes;
              }
            }
          );
          
          // 标记文件上传完成
          setUploadProgress(prev => {
            const updated = prev.map((item, index) => 
              index === i ? { ...item, status: 'completed' as const, progress: 100 } : item
            );
            
            // 重新计算整体进度
            const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
            const weightedProgress = updated.reduce((sum, item, idx) => {
              const fileWeight = selectedFiles[idx].size / totalSize;
              return sum + (item.progress * fileWeight);
            }, 0);
            setOverallProgress(weightedProgress);
            
            return updated;
          });
          
        } catch (error) {
          // 标记文件上传失败
          setUploadProgress(prev => prev.map((item, index) => 
            index === i ? { 
              ...item, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : '上传失败' 
            } : item
          ));
          
          console.error(`文件 ${file.name} 上传失败:`, error);
        }
      }
      
      // 检查是否所有文件都上传成功
      const hasErrors = uploadProgress.some(item => item.status === 'error');
      
      if (!hasErrors) {
        // 所有文件上传成功，延迟关闭以显示完成状态
        setTimeout(() => {
          setSelectedFiles([]);
          setTags('');
          setIsPublic(false);
          setUploadProgress([]);
          setOverallProgress(0);
          setUploading(false);
          onUploadSuccess?.();
          onClose();
        }, 1000);
      }
      
    } catch (error) {
      console.error('上传失败:', error);
      alert(error instanceof Error ? error.message : '文件上传失败');
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setIsPublic(false);
      setTags('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">上传文件</h2>
              <button
                onClick={handleClose}
                disabled={uploading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* 文件拖拽区域 */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  拖拽文件到此处或点击选择
                </h3>
                <p className="text-gray-600">
                  支持多文件上传，最大单文件 5GB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* 已选择的文件列表 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">已选择的文件 ({selectedFiles.length})</h4>
                    {uploading && (
                      <div className="text-sm text-gray-600">
                        整体进度: {Math.round(overallProgress)}%
                      </div>
                    )}
                  </div>
                  
                  {/* 整体进度条 */}
                  {uploading && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file.type);
                      const progressInfo = uploadProgress.find(p => p.file === file);
                      
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className="p-3 bg-gray-50 rounded-lg space-y-2"
                        >
                          <div className="flex items-center gap-3">
                            <FileIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            
                            {/* 状态指示器 */}
                            {progressInfo && (
                              <div className="flex items-center gap-2">
                                {progressInfo.status === 'uploading' && (
                                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                )}
                                {progressInfo.status === 'completed' && (
                                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  </div>
                                )}
                                {progressInfo.status === 'error' && (
                                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                    <X className="w-2 h-2 text-white" />
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {!uploading && (
                              <button
                                onClick={() => removeFile(index)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          {/* 单个文件进度条 */}
                          {progressInfo && progressInfo.status !== 'pending' && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className={`${
                                  progressInfo.status === 'completed' ? 'text-green-600' :
                                  progressInfo.status === 'error' ? 'text-red-600' :
                                  'text-blue-600'
                                }`}>
                                  {progressInfo.status === 'completed' ? '上传完成' :
                                   progressInfo.status === 'error' ? (progressInfo.error || '上传失败') :
                                   '上传中...'}
                                </span>
                                <span className="text-gray-500">
                                  {Math.round(progressInfo.progress)}%
                                </span>
                              </div>
                              
                              {/* 大文件上传详细信息 */}
                              {progressInfo.status === 'uploading' && file.size > 100 * 1024 * 1024 && (
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>
                                    {progressInfo.uploadSpeed && progressInfo.uploadSpeed > 0 ? 
                                      `速度: ${formatUploadSpeed(progressInfo.uploadSpeed)}` : 
                                      '计算速度中...'}
                                  </span>
                                  <span>
                                    {progressInfo.estimatedTimeRemaining && progressInfo.estimatedTimeRemaining > 0 ? 
                                      `剩余: ${formatTimeRemaining(progressInfo.estimatedTimeRemaining)}` : 
                                      '计算时间中...'}
                                  </span>
                                </div>
                              )}
                              
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    progressInfo.status === 'completed' ? 'bg-green-500' :
                                    progressInfo.status === 'error' ? 'bg-red-500' :
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${progressInfo.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 上传选项 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={uploading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-700">
                    公开文件（其他用户可以访问）
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签（可选）
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={uploading}
                    placeholder="用逗号分隔多个标签，如：文档,重要,项目"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={uploading}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="min-w-[100px]"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    上传中...
                  </div>
                ) : (
                  `上传 ${selectedFiles.length} 个文件`
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};