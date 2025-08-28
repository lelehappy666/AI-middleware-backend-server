import React from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

// 表格根组件
interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn(
            'w-full caption-bottom text-sm border-separate border-spacing-0',
            className
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);
Table.displayName = 'Table';

// 表格头部
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={cn(
          'bg-gray-50/80 dark:bg-gray-800/50',
          className
        )}
        {...props}
      >
        {children}
      </thead>
    );
  }
);
TableHeader.displayName = 'TableHeader';

// 表格主体
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={cn('bg-white dark:bg-gray-900', className)}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);
TableBody.displayName = 'TableBody';

// 表格行
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  hover?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = true, children, ...props }, ref) => {
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
    const trRef = React.useRef<HTMLTableRowElement>(null);
    
    React.useImperativeHandle(ref, () => trRef.current!);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onDrag) {
        const handler = onDrag as unknown as (event: DragEvent) => void;
        element.addEventListener('drag', handler);
        return () => element.removeEventListener('drag', handler);
      }
    }, [onDrag]);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onDragEnd) {
        const handler = onDragEnd as unknown as (event: DragEvent) => void;
        element.addEventListener('dragend', handler);
        return () => element.removeEventListener('dragend', handler);
      }
    }, [onDragEnd]);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onDragStart) {
        const handler = onDragStart as unknown as (event: DragEvent) => void;
        element.addEventListener('dragstart', handler);
        return () => element.removeEventListener('dragstart', handler);
      }
    }, [onDragStart]);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onAnimationStart) {
        const handler = onAnimationStart as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationstart', handler);
        return () => element.removeEventListener('animationstart', handler);
      }
    }, [onAnimationStart]);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onAnimationEnd) {
        const handler = onAnimationEnd as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationend', handler);
        return () => element.removeEventListener('animationend', handler);
      }
    }, [onAnimationEnd]);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onAnimationIteration) {
        const handler = onAnimationIteration as unknown as (event: AnimationEvent) => void;
        element.addEventListener('animationiteration', handler);
        return () => element.removeEventListener('animationiteration', handler);
      }
    }, [onAnimationIteration]);
    
    React.useEffect(() => {
      const element = trRef.current;
      if (element && onTransitionEnd) {
        const handler = onTransitionEnd as unknown as (event: TransitionEvent) => void;
        element.addEventListener('transitionend', handler);
        return () => element.removeEventListener('transitionend', handler);
      }
    }, [onTransitionEnd]);
    
    return (
      <motion.tr
        ref={trRef}
        className={cn(
          'border-b border-gray-200/50 dark:border-gray-700/50 transition-colors',
          hover && 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50',
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        {...restProps}
      >
        {children}
      </motion.tr>
    );
  }
);
TableRow.displayName = 'TableRow';

// 表格头单元格
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, children, sortable, sortDirection, onSort, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          'h-12 px-4 text-left align-middle font-semibold text-gray-700 dark:text-gray-300',
          'first:rounded-tl-xl last:rounded-tr-xl',
          'border-b border-gray-200/50 dark:border-gray-700/50',
          sortable && 'cursor-pointer select-none hover:bg-gray-100/50 dark:hover:bg-gray-700/50',
          className
        )}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <div className="flex items-center space-x-2">
          <span>{children}</span>
          {sortable && (
            <div className="flex flex-col">
              <ChevronUp 
                className={cn(
                  'w-3 h-3 transition-colors',
                  sortDirection === 'asc' ? 'text-blue-500' : 'text-gray-400'
                )} 
              />
              <ChevronDown 
                className={cn(
                  'w-3 h-3 -mt-1 transition-colors',
                  sortDirection === 'desc' ? 'text-blue-500' : 'text-gray-400'
                )} 
              />
            </div>
          )}
        </div>
      </th>
    );
  }
);
TableHead.displayName = 'TableHead';

// 表格数据单元格
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          'px-4 py-3 align-middle text-gray-900 dark:text-gray-100',
          'first:rounded-bl-xl last:rounded-br-xl',
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableCell.displayName = 'TableCell';

// 表格标题
interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  children: React.ReactNode;
}

const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <caption
        ref={ref}
        className={cn(
          'mt-4 text-sm text-gray-600 dark:text-gray-400',
          className
        )}
        {...props}
      >
        {children}
      </caption>
    );
  }
);
TableCaption.displayName = 'TableCaption';

// 操作按钮组件
interface TableActionsProps {
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
  }>;
}

const TableActions: React.FC<TableActionsProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            className="absolute right-0 top-8 z-20 min-w-[120px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 py-1"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            {actions.map((action, index) => (
              <button
                key={index}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  action.variant === 'destructive' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-700 dark:text-gray-300',
                  action.disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => {
                  if (!action.disabled) {
                    action.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
};

export {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableActions
};