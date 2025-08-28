import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
  text?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  variant = 'spinner', 
  className,
  text 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (variant === 'spinner') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <motion.div
          className={cn(
            'border-2 border-gray-200 border-t-blue-500 rounded-full',
            'dark:border-gray-700 dark:border-t-blue-400',
            sizes[size]
          )}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        {text && (
          <motion.p
            className={cn(
              'text-gray-600 dark:text-gray-400 font-medium',
              textSizes[size]
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    const dotSize = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-3 h-3'
    };

    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <div className="flex space-x-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={cn(
                'bg-blue-500 rounded-full',
                'dark:bg-blue-400',
                dotSize[size]
              )}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </div>
        {text && (
          <motion.p
            className={cn(
              'text-gray-600 dark:text-gray-400 font-medium',
              textSizes[size]
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <motion.div
          className={cn(
            'bg-blue-500 rounded-full',
            'dark:bg-blue-400',
            sizes[size]
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        {text && (
          <motion.p
            className={cn(
              'text-gray-600 dark:text-gray-400 font-medium',
              textSizes[size]
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    );
  }

  return null;
};

// 全屏加载组件
interface FullScreenLoadingProps {
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

const FullScreenLoading: React.FC<FullScreenLoadingProps> = ({ 
  text = '加载中...', 
  variant = 'spinner' 
}) => {
  return (
    <motion.div
      className="fixed inset-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Loading size="lg" variant={variant} text={text} />
    </motion.div>
  );
};

// 页面加载组件
interface PageLoadingProps {
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

const PageLoading: React.FC<PageLoadingProps> = ({ 
  text = '加载中...', 
  variant = 'spinner',
  className 
}) => {
  return (
    <div className={cn('flex items-center justify-center min-h-[200px]', className)}>
      <Loading size="md" variant={variant} text={text} />
    </div>
  );
};

export { Loading, FullScreenLoading, PageLoading };