import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, variant = 'default', ...props }, ref) => {
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
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    // 添加DOM事件监听器
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onDrag) {
        const handler = onDrag as unknown as (event: DragEvent) => void;
        element.addEventListener('drag', handler);
        return () => element.removeEventListener('drag', handler);
      }
    }, [onDrag]);
    
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onDragEnd) {
        const handler = onDragEnd as unknown as (event: DragEvent) => void;
        element.addEventListener('dragend', handler);
        return () => element.removeEventListener('dragend', handler);
      }
    }, [onDragEnd]);
    
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onDragStart) {
        const handler = onDragStart as unknown as (event: DragEvent) => void;
        element.addEventListener('dragstart', handler);
        return () => element.removeEventListener('dragstart', handler);
      }
    }, [onDragStart]);
    
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onAnimationStart) {
        const handler = onAnimationStart as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationstart', handler);
        return () => element.removeEventListener('animationstart', handler);
      }
    }, [onAnimationStart]);
    
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onAnimationEnd) {
        const handler = onAnimationEnd as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationend', handler);
        return () => element.removeEventListener('animationend', handler);
      }
    }, [onAnimationEnd]);
    
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onAnimationIteration) {
        const handler = onAnimationIteration as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationiteration', handler);
        return () => element.removeEventListener('animationiteration', handler);
      }
    }, [onAnimationIteration]);
    
    React.useEffect(() => {
      const element = inputRef.current;
      if (element && onTransitionEnd) {
        const handler = onTransitionEnd as unknown as (event: TransitionEvent) => void;
        element.addEventListener('transitionend', handler);
        return () => element.removeEventListener('transitionend', handler);
      }
    }, [onTransitionEnd]);
    const [showPassword, setShowPassword] = React.useState(false);
    const [, setIsFocused] = React.useState(false);
    const [, setHasValue] = React.useState(false);

    const inputType = type === 'password' && showPassword ? 'text' : type;

    const baseClasses = [
      'w-full rounded-xl border transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    ].join(' ');

    const variants = {
      default: [
        'bg-white border-gray-300',
        'hover:border-gray-400',
        'focus:border-blue-500 focus:ring-blue-500/20',
        'dark:bg-gray-800 dark:border-gray-600',
        'dark:hover:border-gray-500',
        'dark:focus:border-blue-400'
      ].join(' '),
      filled: [
        'bg-gray-50 border-transparent',
        'hover:bg-gray-100',
        'focus:bg-white focus:border-blue-500 focus:ring-blue-500/20',
        'dark:bg-gray-700 dark:hover:bg-gray-600',
        'dark:focus:bg-gray-800 dark:focus:border-blue-400'
      ].join(' ')
    };

    const sizeClasses = leftIcon || rightIcon || type === 'password' 
      ? 'px-12 py-3 text-sm'
      : 'px-4 py-3 text-sm';

    const errorClasses = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
      : '';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      restProps.onChange?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <motion.label
            className={cn(
              'block text-sm font-medium mb-2 transition-colors duration-200',
              error ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <motion.input
            ref={inputRef}
            type={inputType}
            className={cn(
              baseClasses,
              variants[variant],
              sizeClasses,
              errorClasses,
              leftIcon && 'pl-12',
              (rightIcon || type === 'password') && 'pr-12',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              restProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              restProps.onBlur?.(e);
            }}
            onChange={handleInputChange}
            whileFocus={{ boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)" }}
            {...restProps}
          />
          
          {type === 'password' && (
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          
          {rightIcon && type !== 'password' && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <motion.p
            className={cn(
              'mt-2 text-xs',
              error ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'
            )}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {error || helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };