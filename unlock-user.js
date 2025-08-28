import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unlockUser() {
  try {
    console.log('解锁超级管理员账户...');
    
    // 重置登录失败次数和解锁账户
    const result = await prisma.user.update({
      where: { username: 'admin' },
      data: {
        loginAttempts: 0,
        lockedUntil: null
      }
    });
    
    console.log('✓ 账户解锁成功!');
    console.log(`用户: ${result.username} (${result.email})`);
    console.log(`登录失败次数已重置为: ${result.loginAttempts}`);
    console.log(`锁定状态: ${result.lockedUntil ? '已锁定' : '未锁定'}`);
    
  } catch (error) {
    console.error('解锁账户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

unlockUser();