import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAllUsersCredentials() {
  try {
    console.log('正在查询数据库中所有用户的登录信息...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        plainPassword: true,
        passwordHash: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        role: 'desc' // 超级管理员排在前面
      }
    });

    if (users.length === 0) {
      console.log('数据库中没有找到任何用户');
      return;
    }

    console.log(`\n找到 ${users.length} 个用户账户:\n`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`用户 ${index + 1}:`);
      console.log(`  用户ID: ${user.id}`);
      console.log(`  用户名: ${user.username}`);
      console.log(`  明文密码: ${user.plainPassword || '未设置'}`);
      console.log(`  加密密码: ${user.passwordHash}`);
      console.log(`  姓名: ${user.name || '未设置'}`);
      console.log(`  角色: ${user.role}`);
      console.log(`  状态: ${user.isActive ? '激活' : '禁用'}`);
      console.log(`  创建时间: ${user.createdAt}`);
      console.log(`  更新时间: ${user.updatedAt}`);
      console.log('-'.repeat(50));
    });

    // 统计信息
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN');
    const regularUsers = users.filter(u => u.role === 'USER');
    
    console.log('\n统计信息:');
    console.log(`  超级管理员: ${superAdmins.length} 个`);
    console.log(`  普通用户: ${regularUsers.length} 个`);
    console.log(`  总用户数: ${users.length} 个`);
    
    // 显示登录凭据摘要
    console.log('\n登录凭据摘要:');
    console.log('=' .repeat(60));
    users.forEach(user => {
      console.log(`${user.username} (${user.role}): ${user.plainPassword || '密码未明文存储'}`);
    });
    
  } catch (error) {
    console.error('查询用户信息时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAllUsersCredentials();