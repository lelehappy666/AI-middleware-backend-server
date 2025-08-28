import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const Settings: React.FC = () => {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          系统设置
        </h2>
        <p className="text-gray-600">
          配置系统参数和偏好设置。
        </p>
      </div>

      {/* 设置表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            系统配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <SettingsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              系统设置功能开发中
            </h3>
            <p className="text-gray-600">
              此功能正在开发中，敬请期待。
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Settings;