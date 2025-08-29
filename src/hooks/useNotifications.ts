import { useState, useEffect, useRef, useCallback } from 'react';
import { TokenManager } from '../utils/api';

export type NotificationType = 'online' | 'offline' | 'user_created' | 'user_deleted' | 'stats_update' | 'user_login_activity' | 'user_logout_activity' | 'user_online' | 'user_offline' | 'user_stats_update' | 'heartbeat';

interface NotificationItem {
  id: string;
  type: NotificationType;
  username?: string;
  name?: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

interface NotificationData {
  type: 'user_online' | 'user_offline' | 'user_created' | 'user_deleted' | 'user_stats_update' | 'user_login_activity' | 'user_logout_activity' | 'heartbeat';
  userId?: string;
  username?: string;
  name?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // 监听token变化
  useEffect(() => {
    const currentToken = TokenManager.getAccessToken();
    setToken(currentToken);
  }, []);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 添加通知
  const addNotification = useCallback((notification: NotificationItem) => {
    setNotifications(prev => {
      // 检查是否已存在相同的通知
      const exists = prev.some(n => 
        n.type === notification.type && 
        n.username === notification.username &&
        n.message === notification.message
      );
      
      if (exists) {
        return prev;
      }
      
      return [notification, ...prev.slice(0, 9)]; // 最多保留10条通知
    });

    // 自动移除通知（5秒后）
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  }, [removeNotification]);

  // 清除所有通知
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // 建立SSE连接
  const connectToNotifications = useCallback(() => {
    if (!token || eventSourceRef.current) {
      return;
    }

    try {
      const eventSource = new EventSource(
        `http://localhost:3001/api/notifications/stream?token=${encodeURIComponent(token)}`
      );

      eventSource.onopen = () => {
        console.log('通知连接已建立');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data: NotificationData = JSON.parse(event.data);
          
          // 跳过心跳消息
          if (data.type === 'heartbeat') {
            return;
          }

          let notification: NotificationItem;
          
          switch (data.type) {
            case 'user_online':
              notification = {
                id: `${data.userId}-${data.type}-${Date.now()}`,
                type: 'online',
                username: data.username,
                name: data.name,
                message: `${data.name || data.username} 已上线`,
                timestamp: new Date(data.timestamp)
              };
              break;
            case 'user_offline':
              notification = {
                id: `${data.userId}-${data.type}-${Date.now()}`,
                type: 'offline',
                username: data.username,
                name: data.name,
                message: `${data.name || data.username} 已下线`,
                timestamp: new Date(data.timestamp)
              };
              break;
            case 'user_created':
              notification = {
                id: `user-created-${Date.now()}`,
                type: 'user_created',
                message: data.message,
                timestamp: new Date(data.timestamp)
              };
              break;
            case 'user_deleted':
              notification = {
                id: `user-deleted-${Date.now()}`,
                type: 'user_deleted',
                message: data.message,
                timestamp: new Date(data.timestamp)
              };
              break;
            case 'user_stats_update':
              notification = {
                id: `stats-update-${Date.now()}`,
                type: 'user_stats_update',
                message: data.message || '在线用户数已更新',
                data: {
                  totalUsers: (data as any).totalUsers,
                  onlineUsers: (data as any).onlineUsers,
                  onlineUserIds: (data as any).onlineUserIds
                },
                timestamp: new Date(data.timestamp)
              };
              break;
            case 'user_login_activity':
              notification = {
                id: `login-activity-${data.userId}-${Date.now()}`,
                type: 'user_login_activity',
                username: data.username,
                name: data.name,
                message: data.message || `${data.name || data.username} 登录了系统`,
                timestamp: new Date(data.timestamp)
              };
              break;
            case 'user_logout_activity':
              notification = {
                id: `logout-activity-${data.userId}-${Date.now()}`,
                type: 'user_logout_activity',
                username: data.username,
                name: data.name,
                message: data.message || `${data.name || data.username} 退出了系统`,
                timestamp: new Date(data.timestamp)
              };
              break;
            default:
              return; // 忽略未知类型的通知
          }

          addNotification(notification);
        } catch (error) {
          console.error('解析通知数据失败:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.warn('通知连接错误 - 这通常是因为用户未登录:', error);
        setIsConnected(false);
        
        // 只有在有token的情况下才尝试重连
        if (token) {
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              eventSourceRef.current = null;
              connectToNotifications();
            }
          }, 3000);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('建立通知连接失败:', error);
      setIsConnected(false);
    }
  }, [token, addNotification]);

  // 断开SSE连接
  const disconnectFromNotifications = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      console.log('通知连接已断开');
    }
  };

  // 重连
  const reconnect = () => {
    disconnectFromNotifications();
    setTimeout(connectToNotifications, 1000);
  };

  // 当token变化时，重新建立连接
  useEffect(() => {
    if (token) {
      connectToNotifications();
    } else {
      disconnectFromNotifications();
      clearAllNotifications();
    }

    // 清理函数
    return () => {
      disconnectFromNotifications();
    };
  }, [token, connectToNotifications]);

  // 页面卸载时断开连接并发送下线通知
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 断开SSE连接
      disconnectFromNotifications();
      
      // 发送用户下线通知
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        const offlineData = JSON.stringify({
          offlineTime: new Date().toISOString()
        });
        
        // 使用同步 XMLHttpRequest 确保请求能在页面卸载前完成
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'http://localhost:3001/api/users/offline', false); // false = 同步请求
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          xhr.send(offlineData);
        } catch {
          // 忽略错误，因为页面即将卸载
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectFromNotifications();
    };
  }, []);

  return {
    notifications,
    isConnected,
    addNotification,
    removeNotification,
    clearAllNotifications,
    reconnect
  };
};