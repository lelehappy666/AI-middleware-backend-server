import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkAllUsers() {
  try {
    console.log('检查数据库中的所有用户详细信息...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        passwordHash: true,
        plainPassword: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`\n找到 ${users.length} 个用户:\n`);
    
    for (const user of users) {
      console.log('=' .repeat(50));
      console.log(`用户ID: ${user.id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email || '未设置'}`);
      console.log(`姓名: ${user.name}`);
      console.log(`角色: ${user.role}`);
      console.log(`状态: ${user.isActive ? '激活' : '未激活'}`);
      console.log(`创建时间: ${user.createdAt}`);
      console.log(`更新时间: ${user.updatedAt}`);
      
      // 显示密码哈希
      console.log(`密码哈希: ${user.passwordHash || '未设置'}`);
      
      // 显示明文密码（如果存储了）
      if (user.plainPassword) {
        console.log(`明文密码: ${user.plainPassword}`);
      } else if (user.role === 'SUPER_ADMIN' && user.username === 'admin') {
        console.log(`明文密码: admin123 (默认超级管理员密码)`);
      } else if (user.passwordHash) {
        // 对于普通用户，尝试常见的默认密码
        const commonPasswords = ['123456', 'password', 'user123', user.username, user.name, 'test', 'Test'];
        let foundPassword = null;
        
        for (const testPassword of commonPasswords) {
          if (testPassword) {
            try {
              if (await bcrypt.compare(testPassword, user.passwordHash)) {
                foundPassword = testPassword;
                break;
              }
            } catch (error) {
              // 忽略比较错误，继续尝试下一个密码
            }
          }
        }
        
        if (foundPassword) {
          console.log(`明文密码: ${foundPassword}`);
        } else {
          console.log(`明文密码: 无法确定 (密码已加密，不是常见密码)`);
        }
      } else {
        console.log(`明文密码: 密码字段为空`);
      }
      
      console.log('=' .repeat(50));
      console.log('');
    }
    
    console.log('\n用户信息汇总:');
    console.log(`总用户数: ${users.length}`);
    console.log(`超级管理员: ${users.filter(u => u.role === 'SUPER_ADMIN').length}`);
    console.log(`管理员: ${users.filter(u => u.role === 'ADMIN').length}`);
    console.log(`普通用户: ${users.filter(u => u.role === 'USER').length}`);
    console.log(`激活用户: ${users.filter(u => u.isActive).length}`);
    console.log(`未激活用户: ${users.filter(u => !u.isActive).length}`);
    
  } catch (error) {
    console.error('检查用户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();