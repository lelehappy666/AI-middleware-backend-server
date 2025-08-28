import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

// 导航项接口
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  disabled?: boolean;
  children?: NavItem[];
}

// 侧边栏导航组件
interface SidebarProps {
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (item: NavItem) => void;
  collapsed?: boolean;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  collapsed = false,
  className
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const isActive = activeItem === item.id;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <motion.div
          className={cn(
            'group relative flex items-center px-3 py-2.5 mx-2 rounded-xl transition-all duration-200 cursor-pointer',
            'hover:bg-gray-100/80 dark:hover:bg-gray-800/50',
            isActive && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
            item.disabled && 'opacity-50 cursor-not-allowed',
            level > 0 && 'ml-4'
          )}
          onClick={() => {
            if (item.disabled) return;
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              onItemClick?.(item);
            }
          }}
          whileHover={{ scale: collapsed ? 1.05 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 活跃状态指示器 */}
          {isActive && (
            <motion.div
              className="absolute left-0 top-1/2 w-1 h-6 bg-blue-500 rounded-r-full"
              layoutId="activeIndicator"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}

          {/* 图标 */}
          <div className={cn(
            'flex items-center justify-center w-5 h-5 mr-3',
            collapsed && 'mr-0'
          )}>
            <item.icon className="w-5 h-5" />
          </div>

          {/* 标签和徽章 */}
          {!collapsed && (
            <>
              <span className="flex-1 text-sm font-medium truncate">
                {item.label}
              </span>
              
              {/* 徽章 */}
              {item.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                  {item.badge}
                </span>
              )}

              {/* 展开箭头 */}
              {hasChildren && (
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {/* 子菜单 */}
        {hasChildren && !collapsed && (
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? 'auto' : 0,
              opacity: isExpanded ? 1 : 0
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="py-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.nav
      className={cn(
        'h-full bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border-r border-gray-200/50 dark:border-gray-700/50',
        'transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex flex-col h-full py-4">
        <div className="flex-1 space-y-1">
          {items.map(item => renderNavItem(item))}
        </div>
      </div>
    </motion.nav>
  );
};

// 顶部导航组件
interface TopNavProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

const TopNav: React.FC<TopNavProps> = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className
}) => {
  return (
    <header className={cn(
      'bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50',
      'px-6 py-4',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {/* 面包屑导航 */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {crumb.href ? (
                    <a 
                      href={crumb.href} 
                      className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className={index === breadcrumbs.length - 1 ? 'text-gray-900 dark:text-gray-100 font-medium' : ''}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* 标题和副标题 */}
          {title && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {actions && (
          <div className="flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};

// 标签页导航组件
interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onTabChange,
  variant = 'default',
  className
}) => {
  return (
    <div className={cn(
      'flex items-center',
      variant === 'default' ? 'border-b border-gray-200 dark:border-gray-700' : 'space-x-2',
      className
    )}>
      {items.map((item) => {
        const isActive = activeTab === item.id;
        
        return (
          <motion.button
            key={item.id}
            className={cn(
              'relative flex items-center px-4 py-2 text-sm font-medium transition-all duration-200',
              variant === 'default' && [
                'border-b-2 -mb-px',
                isActive 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              ],
              variant === 'pills' && [
                'rounded-lg',
                isActive 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              ],
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => !item.disabled && onTabChange(item.id)}
            whileHover={{ scale: item.disabled ? 1 : 1.02 }}
            whileTap={{ scale: item.disabled ? 1 : 0.98 }}
          >
            {item.icon && (
              <item.icon className="w-4 h-4 mr-2" />
            )}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                {item.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export { Sidebar, TopNav, Tabs };
export type { NavItem, TabItem };