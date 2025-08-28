import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Activity, 
  TrendingUp, 
  Clock,
  Shield,
  Database,
  Plus,
  ArrowRight,
  Server,
  HardDrive,
  Cpu,
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

interface DashboardStats {
  totalUsers: number;
  totalFiles: number;
  activeUsers: number;
  systemLoad: number;
  todayUploads: number;
  todayLogins: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 67,
    disk: 23,
    network: 89
  });

  // 模拟实时数据更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // 模拟系统指标变化
      setSystemMetrics(prev => ({
        cpu: Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(95, prev.memory + (Math.random() - 0.5) * 8)),
        disk: Math.max(10, Math.min(80, prev.disk + (Math.random() - 0.5) * 5)),
        network: Math.max(50, Math.min(100, prev.network + (Math.random() - 0.5) * 15))
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // 模拟数据
  const stats: DashboardStats = {
    totalUsers: 1248,
    totalFiles: 3567,
    activeUsers: 89,
    systemLoad: Math.round(systemMetrics.cpu),
    todayUploads: 156,
    todayLogins: 234
  };

  const welcomeMessages = [
    "今天是美好的一天，开始您的工作吧！",
    "系统运行正常，一切准备就绪。",
    "欢迎回来！您有新的任务等待处理。",
    "AI中台系统为您提供最佳服务体验。"
  ];

  const recentActivities = [
    { id: 1, user: "张三", action: "上传了文件", file: "项目报告.pdf", time: "2分钟前", type: "upload" },
    { id: 2, user: "李四", action: "创建了用户", file: "新员工账户", time: "5分钟前", type: "user" },
    { id: 3, user: "王五", action: "修改了权限", file: "系统配置", time: "10分钟前", type: "permission" },
    { id: 4, user: "赵六", action: "删除了文件", file: "临时文档.txt", time: "15分钟前", type: "delete" },
    { id: 5, user: "钱七", action: "登录系统", file: "管理后台", time: "18分钟前", type: "login" }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'user': return <Users className="w-4 h-4 text-green-600" />;
      case 'permission': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'delete': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'login': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'disk' | 'network') => {
    if (type === 'network') {
      return value > 80 ? 'text-green-600' : value > 50 ? 'text-yellow-600' : 'text-red-600';
    }
    return value > 80 ? 'text-red-600' : value > 60 ? 'text-yellow-600' : 'text-green-600';
  };

  const getMetricBgColor = (value: number, type: 'cpu' | 'memory' | 'disk' | 'network') => {
    if (type === 'network') {
      return value > 80 ? 'bg-green-600' : value > 50 ? 'bg-yellow-600' : 'bg-red-600';
    }
    return value > 80 ? 'bg-red-600' : value > 60 ? 'bg-yellow-600' : 'bg-green-600';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 欢迎区域 */}
      <motion.div 
        variants={itemVariants}
        className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">欢迎回来，管理员！</h1>
              <p className="text-blue-100 text-lg">
                {welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">当前时间</p>
              <p className="text-white font-medium">
                {currentTime.toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总用户数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+12% 较上月</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">文件总数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFiles.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+8% 较上月</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃用户</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <Clock className="w-4 h-4 text-blue-500 mr-1" />
              <span className="text-sm text-blue-600">当前在线</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今日上传</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayUploads}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+{stats.todayLogins} 登录</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 系统监控和快捷操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 系统监控 */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                系统监控
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">CPU</span>
                  </div>
                  <span className={`text-sm font-medium ${getMetricColor(systemMetrics.cpu, 'cpu')}`}>
                    {Math.round(systemMetrics.cpu)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getMetricBgColor(systemMetrics.cpu, 'cpu')}`}
                    style={{ width: `${systemMetrics.cpu}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">内存</span>
                  </div>
                  <span className={`text-sm font-medium ${getMetricColor(systemMetrics.memory, 'memory')}`}>
                    {Math.round(systemMetrics.memory)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getMetricBgColor(systemMetrics.memory, 'memory')}`}
                    style={{ width: `${systemMetrics.memory}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium">磁盘</span>
                  </div>
                  <span className={`text-sm font-medium ${getMetricColor(systemMetrics.disk, 'disk')}`}>
                    {Math.round(systemMetrics.disk)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getMetricBgColor(systemMetrics.disk, 'disk')}`}
                    style={{ width: `${systemMetrics.disk}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium">网络</span>
                  </div>
                  <span className={`text-sm font-medium ${getMetricColor(systemMetrics.network, 'network')}`}>
                    {Math.round(systemMetrics.network)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getMetricBgColor(systemMetrics.network, 'network')}`}
                    style={{ width: `${systemMetrics.network}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 快捷操作 */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                快捷操作
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-blue-50 hover:border-blue-200 transition-colors"
                onClick={() => navigate('/users')}
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加用户
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-green-50 hover:border-green-200 transition-colors"
                onClick={() => navigate('/files')}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  文件管理
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-purple-50 hover:border-purple-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  查看报告
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between hover:bg-orange-50 hover:border-orange-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  系统设置
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* 今日概览 */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                今日概览
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">新增用户</p>
                    <p className="text-xs text-gray-600">今日注册</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600">12</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">文件上传</p>
                    <p className="text-xs text-gray-600">今日上传</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">{stats.todayUploads}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">用户登录</p>
                    <p className="text-xs text-gray-600">今日登录</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-purple-600">{stats.todayLogins}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 最近活动 */}
      <motion.div variants={itemVariants}>
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              最近活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <motion.div 
                  key={activity.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.user} {activity.action}
                      </p>
                      <p className="text-xs text-gray-600">{activity.file}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;