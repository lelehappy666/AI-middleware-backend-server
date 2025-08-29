/**
 * 日志配置文件
 * 用于控制控制台日志输出，屏蔽周期性消息，保留关键信息
 */

// 需要屏蔽的周期性日志模式
const BLOCKED_LOG_PATTERNS = [
  // Prisma查询日志
  /^prisma:query/,
  // 定期的系统状态检查（包括所有状态码）
  /GET \/api\/system\/status/,
  /GET \/api\/notifications\/user-stats/,
  /GET \/api\/notifications\/online-users/,
  // 简化的请求日志（匹配实际格式）
  /^请求: GET \/system\/status$/,
  /^请求: GET \/notifications\/user-stats$/,
  /^请求: GET \/notifications\/online-users$/,
  /^请求: GET \/notifications\/stream$/,
  // 会话更新查询（每次请求都会触发）
  /UPDATE.*user_sessions.*SET.*last_used_at/,
  /SELECT.*user_sessions.*WHERE.*access_token_jti/,
  /SELECT.*users.*WHERE.*id.*IN/,
  // 统计查询
  /SELECT COUNT\(\*\).*FROM.*users/,
  /SELECT COUNT\(\*\).*FROM.*files/,
  /SELECT COUNT\(\*\).*FROM.*user_sessions/,
  // 健康检查
  /SELECT 1 as test/,
  // 304状态码的缓存响应
  /304.*ms/,
];

// 需要保留的关键日志模式
const IMPORTANT_LOG_PATTERNS = [
  // 用户登录/登出相关
  /用户.*登录/,
  /用户.*登出/,
  /用户.*上线/,
  /用户.*下线/,
  /POST \/api\/auth\/login/,
  /POST \/api\/auth\/logout/,
  // 用户管理操作
  /POST \/api\/users/,
  /PUT \/api\/users/,
  /DELETE \/api\/users/,
  // 文件操作
  /POST \/api\/files/,
  /DELETE \/api\/files/,
  // 系统错误
  /❌/,
  /ERROR/,
  /Error/,
  // 服务器启动/关闭
  /Server ready/,
  /Server closed/,
  // 通知相关（但排除周期性的）
  /🔔.*通知/,
  /📡.*SSE连接/,
  /✅.*通知已发送/,
  /📊.*通知发送完成/,
];

/**
 * 检查日志是否应该被屏蔽
 * @param message 日志消息
 * @returns true表示应该屏蔽，false表示应该显示
 */
export const shouldBlockLog = (message: string): boolean => {
  // 检查是否启用了日志过滤
  const enableFiltering = process.env.ENABLE_LOG_FILTERING === 'true';
  if (!enableFiltering) {
    return false; // 如果未启用过滤，不屏蔽任何日志
  }
  
  // 首先检查是否是重要日志，重要日志永远不屏蔽
  for (const pattern of IMPORTANT_LOG_PATTERNS) {
    if (pattern.test(message)) {
      return false;
    }
  }
  
  // 然后检查是否匹配屏蔽模式
  for (const pattern of BLOCKED_LOG_PATTERNS) {
    if (pattern.test(message)) {
      // 调试输出：显示被屏蔽的日志
      // console.log(`🚫 屏蔽日志: ${message}`);
      return true;
    }
  }
  
  return false;
};

/**
 * 过滤后的console.log
 */
export const filteredLog = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldBlockLog(message)) {
    console.log(...args);
  }
};

/**
 * 过滤后的console.error（错误日志永远不屏蔽）
 */
export const filteredError = (...args: any[]) => {
  console.error(...args);
};

/**
 * 过滤后的console.warn
 */
export const filteredWarn = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldBlockLog(message)) {
    console.warn(...args);
  }
};

/**
 * 日志级别配置
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * 当前日志级别（可通过环境变量控制）
 */
export const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

/**
 * 根据级别输出日志
 */
export const logWithLevel = (level: keyof typeof LOG_LEVELS, ...args: any[]) => {
  if (LOG_LEVELS[level] <= CURRENT_LOG_LEVEL) {
    const message = args.join(' ');
    if (!shouldBlockLog(message)) {
      switch (level) {
        case 'ERROR':
          console.error(...args);
          break;
        case 'WARN':
          console.warn(...args);
          break;
        case 'INFO':
          console.log(...args);
          break;
        case 'DEBUG':
          console.debug(...args);
          break;
      }
    }
  }
};