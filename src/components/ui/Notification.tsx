import React, { useState, useEffect } from 'react';
import { X, UserCheck, UserX, UserPlus, UserMinus, BarChart3, LogIn, LogOut, Bell } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'online' | 'offline' | 'user_created' | 'user_deleted' | 'stats_update' | 'user_login_activity' | 'user_logout_activity' | 'user_online' | 'user_offline' | 'user_stats_update' | 'heartbeat';
  username?: string;
  name?: string;
  message: string;
  timestamp: Date;
}

interface NotificationProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notifications, onRemove, onClearAll }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleRemove = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
    setTimeout(() => onRemove(id), 300);
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'online':
      case 'user_online':
        return <UserCheck className="w-4 h-4" />;
      case 'offline':
      case 'user_offline':
        return <UserX className="w-4 h-4" />;
      case 'user_created':
        return <UserPlus className="w-4 h-4" />;
      case 'user_deleted':
        return <UserMinus className="w-4 h-4" />;
      case 'stats_update':
      case 'user_stats_update':
        return <BarChart3 className="w-4 h-4" />;
      case 'user_login_activity':
        return <LogIn className="w-4 h-4" />;
      case 'user_logout_activity':
        return <LogOut className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationMessage = (notification: NotificationItem) => {
    const displayName = notification.name || notification.username;
    switch (notification.type) {
      case 'online':
        return `${displayName} 已上线`;
      case 'offline':
        return `${displayName} 已下线`;
      case 'user_created':
      case 'user_deleted':
      case 'stats_update':
        return notification.message || '系统通知';
      default:
        return notification.message || `${displayName} 状态变更`;
    }
  };

  const getNotificationBgColor = (type: NotificationItem['type']) => {
  switch (type) {
    case 'online':
    case 'user_online':
      return 'bg-green-50 border-green-200';
    case 'offline':
    case 'user_offline':
      return 'bg-red-50 border-red-200';
    case 'user_created':
      return 'bg-blue-50 border-blue-200';
    case 'user_deleted':
      return 'bg-orange-50 border-orange-200';
    case 'stats_update':
    case 'user_stats_update':
      return 'bg-purple-50 border-purple-200';
    case 'user_login_activity':
      return 'bg-emerald-50 border-emerald-200';
    case 'user_logout_activity':
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {/* 清除所有按钮 */}
      {visibleNotifications.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={onClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 bg-white px-2 py-1 rounded shadow-sm border"
          >
            清除所有
          </button>
        </div>
      )}
      
      {/* 通知列表 */}
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getNotificationBgColor(notification.type)}
            border rounded-lg p-3 shadow-lg transform transition-all duration-300 ease-in-out
            hover:shadow-xl animate-slide-in-right
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {getNotificationIcon(notification.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {getNotificationMessage(notification)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(notification.timestamp)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleRemove(notification.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notification;

// 添加CSS动画样式
const styles = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`;

// 将样式注入到页面中
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}