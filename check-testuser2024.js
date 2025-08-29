import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTestUser2024() {
  try {
    console.log('正在搜索用户名为 TestUser2024 的用户...');
    
    // 搜索用户名为 TestUser2024 的用户
    const user = await prisma.user.findFirst({
      where: {
        username: 'TestUser2024'
      }
    });
    
    if (user) {
      console.log('\n找到用户 TestUser2024:');
      console.log('================================');
      console.log(`用户ID: ${user.id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`密码: ${user.plainPassword || '未设置明文密码'}`);
      console.log(`加密密码: ${user.password}`);
      console.log(`邮箱: ${user.email || '未设置'}`);
      console.log(`姓名: ${user.name || '未设置'}`);
      console.log(`角色: ${user.role}`);
      console.log(`状态: ${user.status}`);
      console.log(`创建时间: ${user.createdAt}`);
      console.log(`更新时间: ${user.updatedAt}`);
      console.log('================================');
    } else {
      console.log('\n未找到用户名为 TestUser2024 的用户');
      console.log('================================');
      
      // 显示所有用户名以供参考
      const allUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true
        }
      });
      
      console.log('\n当前数据库中的所有用户:');
      allUsers.forEach(u => {
        console.log(`- ID: ${u.id}, 用户名: ${u.username}, 角色: ${u.role}`);
      });
    }
    
  } catch (error) {
    console.error('查询用户时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestUser2024();