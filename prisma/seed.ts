import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库数据...');

  // 检查是否已有用户
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('数据库已有用户数据，跳过初始化');
    return;
  }

  // 创建唯一的超级管理员（根据用户需求只保留一个超级管理员）
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      id: 'admin-001',
      name: '超级管理员',
      email: 'admin@system.com',
      username: 'admin',
      passwordHash: adminPassword,
      role: Role.SUPER_ADMIN,
      isActive: true
    }
  });
  console.log('✅ 创建超级管理员 - 用户名:', admin.username);

  // 创建示例操作日志
  await prisma.operationLog.createMany({
    data: [
      {
        id: 'log-001',
        operationType: '系统初始化',
        resourceType: 'system',
        operationDetails: { message: '数据库初始化完成' },
        status: 'SUCCESS',
        userId: admin.id,
        ipAddress: '127.0.0.1',
        userAgent: 'System'
      },
      {
        id: 'log-002',
        operationType: '用户创建',
        resourceType: 'user',
        resourceId: admin.id,
        operationDetails: { message: '创建默认用户账户' },
        status: 'SUCCESS',
        userId: admin.id,
        ipAddress: '127.0.0.1',
        userAgent: 'System'
      }
    ]
  });
  console.log('✅ 创建示例操作日志');

  console.log('\n🎉 数据库初始化完成！');
  console.log('\n超级管理员账户信息:');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('\n请使用上述用户名和密码登录系统。');
}

main()
  .catch((e) => {
    console.error('❌ 数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });