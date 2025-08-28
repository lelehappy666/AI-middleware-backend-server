import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    // 分离出可能与framer-motion冲突的HTML事件处理器
    const {
      onDrag,
      onDragEnd, 
      onDragStart,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      onTransitionEnd,
      ...restProps
    } = props;
    
    // 创建一个包装的ref来处理DOM事件
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    
    React.useImperativeHandle(ref, () => buttonRef.current!);
    
    // 添加DOM事件监听器
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onDrag) {
        const handler = onDrag as unknown as (event: DragEvent) => void;
        element.addEventListener('drag', handler);
        return () => element.removeEventListener('drag', handler);
      }
    }, [onDrag]);
    
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onDragEnd) {
        const handler = onDragEnd as unknown as (event: DragEvent) => void;
        element.addEventListener('dragend', handler);
        return () => element.removeEventListener('dragend', handler);
      }
    }, [onDragEnd]);
    
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onDragStart) {
        const handler = onDragStart as unknown as (event: DragEvent) => void;
        element.addEventListener('dragstart', handler);
        return () => element.removeEventListener('dragstart', handler);
      }
    }, [onDragStart]);
    
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onAnimationStart) {
        const handler = onAnimationStart as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationstart', handler);
        return () => element.removeEventListener('animationstart', handler);
      }
    }, [onAnimationStart]);
    
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onAnimationEnd) {
        const handler = onAnimationEnd as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationend', handler);
        return () => element.removeEventListener('animationend', handler);
      }
    }, [onAnimationEnd]);
    
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onAnimationIteration) {
        const handler = onAnimationIteration as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationiteration', handler);
        return () => element.removeEventListener('animationiteration', handler);
      }
    }, [onAnimationIteration]);
    
    React.useEffect(() => {
      const element = buttonRef.current;
      if (element && onTransitionEnd) {
        const handler = onTransitionEnd as unknown as (event: TransitionEvent) => void;
        element.addEventListener('transitionend', handler);
        return () => element.removeEventListener('transitionend', handler);
      }
    }, [onTransitionEnd]);
    const baseClasses = [
      'inline-flex items-center justify-center rounded-xl font-medium',
      'transition-all duration-200 ease-out',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95'
    ].join(' ');

    const variants = {
      primary: [
        'bg-gradient-to-b from-blue-500 to-blue-600',
        'hover:from-blue-600 hover:to-blue-700',
        'text-white shadow-lg shadow-blue-500/25',
        'focus:ring-blue-500/50'
      ].join(' '),
      secondary: [
        'bg-gradient-to-b from-gray-100 to-gray-200',
        'hover:from-gray-200 hover:to-gray-300',
        'text-gray-900 shadow-sm',
        'focus:ring-gray-500/50',
        'dark:from-gray-700 dark:to-gray-800',
        'dark:hover:from-gray-600 dark:hover:to-gray-700',
        'dark:text-white'
      ].join(' '),
      outline: [
        'border-2 border-gray-300 bg-white',
        'hover:bg-gray-50 hover:border-gray-400',
        'text-gray-700',
        'focus:ring-gray-500/50',
        'dark:border-gray-600 dark:bg-gray-800',
        'dark:hover:bg-gray-700 dark:hover:border-gray-500',
        'dark:text-gray-200'
      ].join(' '),
      ghost: [
        'bg-transparent hover:bg-gray-100',
        'text-gray-700',
        'focus:ring-gray-500/50',
        'dark:hover:bg-gray-800',
        'dark:text-gray-200'
      ].join(' '),
      destructive: [
        'bg-gradient-to-b from-red-500 to-red-600',
        'hover:from-red-600 hover:to-red-700',
        'text-white shadow-lg shadow-red-500/25',
        'focus:ring-red-500/50'
      ].join(' ')
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-6 py-3 text-base h-12'
    };

    return (
      <motion.button
        ref={buttonRef}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        {...restProps}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };