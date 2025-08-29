import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAdminUsername() {
  try {
    console.log('开始更新超级管理员用户名...');
    
    // 查找当前的超级管理员用户
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });
    
    if (!adminUser) {
      console.log('未找到超级管理员用户');
      return;
    }
    
    console.log('找到超级管理员用户:', adminUser.username);
    
    // 更新用户名为admin
    const updatedUser = await prisma.user.update({
      where: {
        id: adminUser.id
      },
      data: {
        username: 'admin'
      }
    });
    
    console.log('超级管理员用户名已更新为:', updatedUser.username);
    console.log('更新完成!');
    
  } catch (error) {
    console.error('更新超级管理员用户名时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminUsername();