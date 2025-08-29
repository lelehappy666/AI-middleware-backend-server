import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePlainPasswords() {
  try {
    console.log('正在更新用户明文密码字段...');
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        plainPassword: true
      }
    });
    
    console.log(`找到 ${users.length} 个用户`);
    
    // 根据已知的密码信息更新plainPassword字段
    const passwordMap = {
      'admin': 'admin123',
      'Test': '12345678',
      'Test User 3': '12345678',
      '891': '12345678',
      'TestUser2024': '456789123'
    };
    
    for (const user of users) {
      const knownPassword = passwordMap[user.username] || passwordMap[user.name];
      
      if (knownPassword && !user.plainPassword) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plainPassword: knownPassword }
        });
        console.log(`已更新用户 ${user.name} (${user.username}) 的明文密码`);
      } else if (user.plainPassword) {
        console.log(`用户 ${user.name} (${user.username}) 已有明文密码: ${user.plainPassword}`);
      } else {
        console.log(`用户 ${user.name} (${user.username}) 未找到对应的明文密码`);
      }
    }
    
    console.log('明文密码更新完成');
    
  } catch (error) {
    console.error('更新明文密码时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePlainPasswords();