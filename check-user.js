import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('检查数据库中的用户...');
    
    // 查找所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
        createdAt: true
      }
    });
    
    console.log(`找到 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`- ID: ${user.id}, 用户名: ${user.username || '未设置'}, 邮箱: ${user.email}, 姓名: ${user.name}, 角色: ${user.role}, 激活: ${user.isActive}`);
    });
    
    // 检查超级管理员用户的密码
    const adminUser = users.find(u => u.role === 'SUPER_ADMIN');
    if (adminUser) {
      console.log('\n检查超级管理员密码...');
      console.log(`用户名/邮箱: ${adminUser.email}`);
      console.log(`用户ID: ${adminUser.id}`);
      
      // 测试常见密码
      const commonPasswords = ['admin123', 'admin', '123456', 'password'];
      for (const password of commonPasswords) {
        const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
        if (isPasswordValid) {
          console.log(`✓ 找到正确密码: ${password}`);
          break;
        }
      }
      console.log(`密码哈希: ${adminUser.passwordHash}`);
    } else {
      console.log('\n未找到超级管理员用户');
    }
    
  } catch (error) {
    console.error('检查用户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();