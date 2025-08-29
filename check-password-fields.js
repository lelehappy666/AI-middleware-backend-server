import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPasswordFields() {
  try {
    console.log('检查数据库中用户的密码字段同步情况...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        passwordHash: true,
        plainPassword: true
      }
    });
    
    console.log('用户密码字段检查:');
    users.forEach(user => {
      console.log(`用户: ${user.name} (${user.username})`);
      console.log(`  passwordHash: ${user.passwordHash ? '已设置 (长度: ' + user.passwordHash.length + ')' : '未设置'}`);
      console.log(`  plainPassword: ${user.plainPassword || '未设置'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswordFields();