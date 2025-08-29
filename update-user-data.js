import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserData() {
  try {
    console.log('=== 开始更新用户数据 ===\n');
    
    // 获取所有用户数据
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true
      }
    });
    
    console.log(`找到 ${users.length} 个用户需要处理\n`);
    
    // 显示更新计划
    console.log('=== 更新计划 ===');
    users.forEach(user => {
      console.log(`用户 ID: ${user.id}`);
      console.log(`  当前用户名: "${user.username}"`);
      console.log(`  当前姓名: "${user.name}"`);
      console.log(`  将用户名更新为: "${user.name}"`);
      console.log(`  当前邮箱: "${user.email || 'NULL'}"`);
      console.log(`  将邮箱设置为: NULL`);
      console.log('---');
    });
    
    console.log('\n开始执行更新操作...');
    
    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      const updateResults = [];
      
      for (const user of users) {
        // 更新每个用户：将用户名设置为姓名的值，移除邮箱
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            username: user.name, // 将用户名同步为姓名的值
            email: null // 移除邮箱字段
          },
          select: {
            id: true,
            username: true,
            name: true,
            email: true
          }
        });
        
        updateResults.push({
          id: user.id,
          oldUsername: user.username,
          newUsername: updatedUser.username,
          name: updatedUser.name,
          oldEmail: user.email,
          newEmail: updatedUser.email
        });
        
        console.log(`✓ 已更新用户 ${user.id}: 用户名 "${user.username}" -> "${updatedUser.username}", 邮箱已移除`);
      }
      
      return updateResults;
    });
    
    console.log('\n=== 更新完成 ===');
    console.log(`成功更新了 ${result.length} 个用户`);
    
    console.log('\n=== 更新结果摘要 ===');
    result.forEach(user => {
      console.log(`用户 ID: ${user.id}`);
      console.log(`  用户名: "${user.oldUsername}" -> "${user.newUsername}"`);
      console.log(`  姓名: "${user.name}" (保持不变)`);
      console.log(`  邮箱: "${user.oldEmail || 'NULL'}" -> "${user.newEmail || 'NULL'}"`);
      console.log('---');
    });
    
    console.log('\n✅ 所有用户数据更新成功！');
    console.log('- 用户名已同步为姓名的值');
    console.log('- 所有用户的邮箱字段已移除');
    
  } catch (error) {
    console.error('❌ 更新用户数据时出错:', error);
    console.log('\n事务已回滚，数据库状态未改变。');
  } finally {
    await prisma.$disconnect();
  }
}

// 添加确认提示
console.log('⚠️  警告：此操作将修改数据库中的用户数据！');
console.log('- 将所有用户的用户名同步为姓名的值');
console.log('- 移除所有用户的邮箱字段');
console.log('\n按 Ctrl+C 取消，或等待 3 秒后自动开始...');

setTimeout(() => {
  updateUserData();
}, 3000);