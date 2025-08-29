import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TokenManager } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Trash2, LogIn, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface DecodedToken {
  userId: string;
  username: string;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

const TokenDebug: React.FC = () => {
  const navigate = useNavigate();
  const { logout, refreshToken } = useAuthStore();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(false);
  const [sseStatus, setSseStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [sseEventSource, setSseEventSource] = useState<EventSource | null>(null);

  // 解码JWT token
  const decodeToken = (token: string): DecodedToken | null => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Token解码失败:', error);
      return null;
    }
  };

  // 检查token是否过期
  const checkTokenExpiry = (decoded: DecodedToken): boolean => {
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  // 加载token信息
  const loadTokenInfo = () => {
    const access = TokenManager.getAccessToken();
    const refresh = TokenManager.getRefreshToken();
    
    setAccessToken(access);
    setRefreshTokenValue(refresh);
    
    if (access) {
      const decoded = decodeToken(access);
      setDecodedToken(decoded);
      if (decoded) {
        setIsTokenExpired(checkTokenExpiry(decoded));
      }
    } else {
      setDecodedToken(null);
      setIsTokenExpired(false);
    }
  };

  // 刷新token
  const handleRefreshToken = async () => {
    try {
      await refreshToken();
      loadTokenInfo();
      toast.success('Token刷新成功');
    } catch (error) {
      console.error('Token刷新失败:', error);
      toast.error('Token刷新失败');
    }
  };

  // 清除token
  const handleClearTokens = () => {
    TokenManager.clearTokens();
    loadTokenInfo();
    toast.success('Token已清除');
  };

  // 测试SSE连接
  const testSSEConnection = () => {
    if (sseEventSource) {
      sseEventSource.close();
      setSseEventSource(null);
    }

    const token = TokenManager.getAccessToken();
    if (!token) {
      toast.error('没有可用的access token');
      return;
    }

    setSseStatus('connecting');
    const eventSource = new EventSource(`http://localhost:3001/api/notifications/stream?token=${encodeURIComponent(token)}`);
    
    eventSource.onopen = () => {
      setSseStatus('connected');
      toast.success('SSE连接成功');
    };

    eventSource.onmessage = (event) => {
      console.log('SSE消息:', event.data);
      try {
        const data = JSON.parse(event.data);
        toast.info(`收到通知: ${data.type}`);
      } catch (error) {
        console.log('SSE原始消息:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      setSseStatus('error');
      toast.error('SSE连接失败');
      eventSource.close();
    };

    setSseEventSource(eventSource);
  };

  // 断开SSE连接
  const disconnectSSE = () => {
    if (sseEventSource) {
      sseEventSource.close();
      setSseEventSource(null);
      setSseStatus('disconnected');
      toast.info('SSE连接已断开');
    }
  };

  useEffect(() => {
    loadTokenInfo();
    
    // 清理函数
    return () => {
      if (sseEventSource) {
        sseEventSource.close();
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Token调试工具</h1>
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          返回Dashboard
        </Button>
      </div>

      {/* Token状态概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Token状态概览
            <Badge variant={accessToken ? (isTokenExpired ? 'destructive' : 'default') : 'secondary'}>
              {accessToken ? (isTokenExpired ? '已过期' : '有效') : '无Token'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Access Token存在</label>
              <p className="text-lg">{accessToken ? '✅ 是' : '❌ 否'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Refresh Token存在</label>
              <p className="text-lg">{refreshTokenValue ? '✅ 是' : '❌ 否'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token详细信息 */}
      {decodedToken && (
        <Card>
          <CardHeader>
            <CardTitle>Token详细信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">用户ID</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{decodedToken.userId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">用户名</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{decodedToken.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">角色</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{decodedToken.role}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">JWT ID</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{decodedToken.jti}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">签发时间</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{formatTimestamp(decodedToken.iat)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">过期时间</label>
                <p className={`font-mono text-sm p-2 rounded ${
                  isTokenExpired ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                }`}>
                  {formatTimestamp(decodedToken.exp)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SSE连接测试 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            SSE连接测试
            {sseStatus === 'connected' && <Wifi className="w-5 h-5 text-green-500" />}
            {sseStatus === 'error' && <WifiOff className="w-5 h-5 text-red-500" />}
            <Badge variant={
              sseStatus === 'connected' ? 'default' :
              sseStatus === 'connecting' ? 'secondary' :
              sseStatus === 'error' ? 'destructive' : 'outline'
            }>
              {sseStatus === 'connected' ? '已连接' :
               sseStatus === 'connecting' ? '连接中' :
               sseStatus === 'error' ? '连接失败' : '未连接'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testSSEConnection} 
              disabled={!accessToken || sseStatus === 'connecting'}
              variant="default"
            >
              {sseStatus === 'connecting' ? '连接中...' : '测试SSE连接'}
            </Button>
            <Button 
              onClick={disconnectSSE} 
              disabled={sseStatus !== 'connected'}
              variant="outline"
            >
              断开连接
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            测试与后端SSE通知服务的连接状态。连接成功后会显示实时通知。
          </p>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>Token操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleRefreshToken} 
              disabled={!refreshTokenValue}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新Token
            </Button>
            <Button 
              onClick={handleClearTokens} 
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              清除所有Token
            </Button>
            <Button 
              onClick={() => navigate('/login')} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              重新登录
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token原始数据 */}
      {accessToken && (
        <Card>
          <CardHeader>
            <CardTitle>原始Token数据</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Access Token</label>
              <textarea 
                className="w-full h-24 font-mono text-xs bg-gray-100 p-2 rounded border"
                value={accessToken}
                readOnly
              />
            </div>
            {refreshTokenValue && (
              <div>
                <label className="text-sm font-medium text-gray-600">Refresh Token</label>
                <textarea 
                  className="w-full h-24 font-mono text-xs bg-gray-100 p-2 rounded border"
                  value={refreshTokenValue}
                  readOnly
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TokenDebug;