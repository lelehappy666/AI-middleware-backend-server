import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStructure() {
  try {
    console.log('=== 检查数据库用户表结构和数据 ===\n');
    
    // 获取所有用户数据
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`总用户数: ${users.length}\n`);
    
    console.log('当前用户数据:');
    console.log('ID\t用户名\t\t姓名\t\t邮箱\t\t角色\t状态');
    console.log('='.repeat(80));
    
    users.forEach(user => {
      console.log(`${user.id}\t${user.username || 'N/A'}\t\t${user.name || 'N/A'}\t\t${user.email || 'N/A'}\t\t${user.role}\t${user.isActive}`);
    });
    
    console.log('\n=== 字段分析 ===');
    console.log('用户名字段 (username):');
    users.forEach(user => {
      console.log(`  ID ${user.id}: "${user.username || 'NULL'}"`);
    });
    
    console.log('\n姓名字段 (name):');
    users.forEach(user => {
      console.log(`  ID ${user.id}: "${user.name || 'NULL'}"`);
    });
    
    console.log('\n邮箱字段 (email):');
    users.forEach(user => {
      console.log(`  ID ${user.id}: "${user.email || 'NULL'}"`);
    });
    
    console.log('\n=== 需要同步的数据分析 ===');
    const needsSync = users.filter(user => user.username !== user.name);
    if (needsSync.length > 0) {
      console.log('需要同步用户名和姓名的用户:');
      needsSync.forEach(user => {
        console.log(`  ID ${user.id}: 用户名="${user.username}" -> 姓名="${user.name}"`);
      });
    } else {
      console.log('所有用户的用户名和姓名已同步');
    }
    
    const hasEmail = users.filter(user => user.email);
    console.log(`\n有邮箱的用户数: ${hasEmail.length}`);
    if (hasEmail.length > 0) {
      console.log('需要移除邮箱的用户:');
      hasEmail.forEach(user => {
        console.log(`  ID ${user.id}: "${user.email}"`);
      });
    }
    
  } catch (error) {
    console.error('检查数据库结构时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();