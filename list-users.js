import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        plainPassword: true
      }
    });
    
    console.log('数据库中的所有用户:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   激活状态: ${user.isActive}`);
      console.log(`   明文密码: ${user.plainPassword}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('查询用户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();