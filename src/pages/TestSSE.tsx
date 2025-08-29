import React, { useState, useEffect } from 'react';
import { TokenManager } from '../utils/api';

const TestSSE: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('未连接');
  const [messages, setMessages] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    const currentToken = TokenManager.getAccessToken();
    setToken(currentToken);
    console.log('当前token:', currentToken);
  }, []);

  const connectSSE = () => {
    if (!token) {
      setMessages(prev => [...prev, '错误: 没有找到token']);
      return;
    }

    if (eventSource) {
      eventSource.close();
    }

    const url = `http://localhost:3001/api/notifications/stream?token=${encodeURIComponent(token)}`;
    console.log('连接SSE URL:', url);
    setMessages(prev => [...prev, `尝试连接: ${url}`]);

    const es = new EventSource(url);

    es.onopen = () => {
      console.log('SSE连接已建立');
      setConnectionStatus('已连接');
      setMessages(prev => [...prev, 'SSE连接已建立']);
    };

    es.onmessage = (event) => {
      console.log('收到SSE消息:', event.data);
      setMessages(prev => [...prev, `收到消息: ${event.data}`]);
    };

    es.onerror = (error) => {
      console.error('SSE连接错误:', error);
      setConnectionStatus('连接错误');
      setMessages(prev => [...prev, `连接错误: ${error.type}`]);
    };

    setEventSource(es);
  };

  const disconnectSSE = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setConnectionStatus('已断开');
      setMessages(prev => [...prev, 'SSE连接已断开']);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">SSE连接测试</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 连接信息 */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">连接信息</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Token状态: </span>
              <span className={token ? 'text-green-600' : 'text-red-600'}>
                {token ? '已获取' : '未获取'}
              </span>
            </div>
            <div>
              <span className="font-medium">连接状态: </span>
              <span className={{
                '已连接': 'text-green-600',
                '连接错误': 'text-red-600',
                '已断开': 'text-yellow-600',
                '未连接': 'text-gray-600'
              }[connectionStatus] || 'text-gray-600'}>
                {connectionStatus}
              </span>
            </div>
            {token && (
              <div className="mt-2">
                <span className="font-medium">Token (前20字符): </span>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {token.substring(0, 20)}...
                </code>
              </div>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="bg-white p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">控制面板</h2>
          <div className="space-y-2">
            <button
              onClick={connectSSE}
              disabled={!token || connectionStatus === '已连接'}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              连接SSE
            </button>
            <button
              onClick={disconnectSSE}
              disabled={connectionStatus !== '已连接'}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              断开连接
            </button>
            <button
              onClick={clearMessages}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清空日志
            </button>
          </div>
        </div>
      </div>

      {/* 消息日志 */}
      <div className="mt-6 bg-white p-4 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">连接日志</h2>
        <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">暂无日志</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TestSSE;