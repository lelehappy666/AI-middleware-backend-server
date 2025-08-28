import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router';
import { useAuthStore } from './store/authStore';
import { Loading } from './components/ui/Loading';

function App() {
  const { getCurrentUser, isLoading } = useAuthStore();

  // 应用启动时检查用户认证状态
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loading size="lg" variant="spinner" />
          <p className="mt-4 text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
