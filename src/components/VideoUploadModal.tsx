import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Video } from 'lucide-react';
import { toast } from 'sonner';
import { FileCategory, getFileAcceptTypes, getSupportedFileTypes, isVideoFile } from '../utils/fileTypeUtils';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  onUpload: (files: File[], onProgress?: (progress: number) => void) => Promise<void>;
}

export default function VideoUploadModal({ isOpen, onClose, onUploadSuccess, onUpload }: VideoUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files: File[]) => {
    // 过滤只保留视频文件
    const videoFiles = files.filter(file => {
      const isVideo = isVideoFile(file);
      if (!isVideo) {
        toast.error(`文件 "${file.name}" 不是支持的视频格式`);
      }
      return isVideo;
    });

    if (videoFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...videoFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileSelection(files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请选择要上传的视频文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      await onUpload(selectedFiles, (progress) => {
        setUploadProgress(progress);
      });
      
      toast.success(`成功上传 ${selectedFiles.length} 个视频文件`);
      setSelectedFiles([]);
      onUploadSuccess();
      onClose();
    } catch (error) {
      console.error('视频上传失败:', error);
      toast.error('视频上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">上传视频文件</h2>
                  <p className="text-sm text-gray-500">支持格式：{getSupportedFileTypes(FileCategory.VIDEO)}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={uploading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* 拖拽上传区域 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  拖拽视频文件到此处，或点击选择
                </h3>
                <p className="text-gray-500 mb-4">
                  支持 {getSupportedFileTypes(FileCategory.VIDEO)} 格式
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  选择视频文件
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={getFileAcceptTypes(FileCategory.VIDEO)}
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={uploading}
                />
              </div>

              {/* 文件列表 */}
              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    已选择的视频文件 ({selectedFiles.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Video className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        {!uploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 上传进度 */}
              {uploading && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">上传进度</span>
                    <span className="text-sm text-gray-500">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleClose}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>上传视频 ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}