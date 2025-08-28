import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', hover = false, children, ...props }, ref) => {
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
    const cardRef = React.useRef<HTMLDivElement>(null);
    
    React.useImperativeHandle(ref, () => cardRef.current!);
    
    // 添加DOM事件监听器
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onDrag) {
        const handler = onDrag as unknown as (event: DragEvent) => void;
        element.addEventListener('drag', handler);
        return () => element.removeEventListener('drag', handler);
      }
    }, [onDrag]);
    
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onDragEnd) {
        const handler = onDragEnd as unknown as (event: DragEvent) => void;
        element.addEventListener('dragend', handler);
        return () => element.removeEventListener('dragend', handler);
      }
    }, [onDragEnd]);
    
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onDragStart) {
        const handler = onDragStart as unknown as (event: DragEvent) => void;
        element.addEventListener('dragstart', handler);
        return () => element.removeEventListener('dragstart', handler);
      }
    }, [onDragStart]);
    
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onAnimationStart) {
        const handler = onAnimationStart as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationstart', handler);
        return () => element.removeEventListener('animationstart', handler);
      }
    }, [onAnimationStart]);
    
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onAnimationEnd) {
        const handler = onAnimationEnd as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationend', handler);
        return () => element.removeEventListener('animationend', handler);
      }
    }, [onAnimationEnd]);
    
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onAnimationIteration) {
        const handler = onAnimationIteration as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationiteration', handler);
        return () => element.removeEventListener('animationiteration', handler);
      }
    }, [onAnimationIteration]);
    
    React.useEffect(() => {
      const element = cardRef.current;
      if (element && onTransitionEnd) {
        const handler = onTransitionEnd as unknown as (event: TransitionEvent) => void;
        element.addEventListener('transitionend', handler);
        return () => element.removeEventListener('transitionend', handler);
      }
    }, [onTransitionEnd]);
    const baseClasses = [
      'rounded-2xl transition-all duration-200',
      'border border-gray-200/50',
      'dark:border-gray-700/50'
    ].join(' ');

    const variants = {
      default: [
        'bg-white/80 backdrop-blur-sm',
        'dark:bg-gray-800/80'
      ].join(' '),
      elevated: [
        'bg-white shadow-lg shadow-gray-900/5',
        'hover:shadow-xl hover:shadow-gray-900/10',
        'dark:bg-gray-800 dark:shadow-gray-900/20'
      ].join(' '),
      outlined: [
        'bg-transparent border-2',
        'border-gray-300 hover:border-gray-400',
        'dark:border-gray-600 dark:hover:border-gray-500'
      ].join(' ')
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    };

    const hoverClasses = hover ? 'hover:scale-[1.02] cursor-pointer' : '';

    return (
      <motion.div
        ref={cardRef}
        className={cn(
          baseClasses,
          variants[variant],
          paddings[padding],
          hoverClasses,
          className
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={hover ? { scale: 1.02 } : undefined}
        {...restProps}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 pb-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight',
          'text-gray-900 dark:text-white',
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          'text-sm text-gray-600 dark:text-gray-400',
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('pt-0', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center pt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };