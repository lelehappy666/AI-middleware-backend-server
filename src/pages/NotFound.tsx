import React from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        className="text-center max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 404 数字 */}
        <motion.div
          className="text-8xl font-bold text-gray-300 mb-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          404
        </motion.div>

        {/* 标题和描述 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            页面未找到
          </h1>
          <p className="text-gray-600 mb-8">
            抱歉，您访问的页面不存在或已被移动。
          </p>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Link to="/">
            <Button variant="primary" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              返回首页
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上页
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;