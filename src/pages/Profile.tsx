import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const Profile: React.FC = () => {
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
          个人中心
        </h2>
        <p className="text-gray-600">
          管理您的个人信息和账户设置。
        </p>
      </div>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            个人信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              个人中心功能开发中
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

export default Profile;