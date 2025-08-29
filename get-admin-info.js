import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAdminInfo() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });
    
    if (admin) {
      console.log('超级管理员信息:');
      console.log('ID:', admin.id);
      console.log('用户名:', admin.username);
      console.log('角色:', admin.role);
    } else {
      console.log('未找到超级管理员');
    }
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getAdminInfo();