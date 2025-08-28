import { PrismaClient } from '@prisma/client';

// 全局声明，避免在开发环境中重复创建实例
declare global {
  var __prisma: PrismaClient | undefined;
}

// 创建 Prisma 客户端实例
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// 在开发环境中缓存实例，避免热重载时重复创建
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// 优雅关闭数据库连接
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;