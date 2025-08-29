import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testPasswordUpdate() {
  try {
    console.log('测试密码修改功能...');
    
    // 找到测试用户
    const testUser = await prisma.user.findFirst({
      where: { username: 'test' }
    });
    
    if (!testUser) {
      console.log('未找到测试用户');
      return;
    }
    
    console.log('修改前:');
    console.log('  用户名:', testUser.username);
    console.log('  plainPassword:', testUser.plainPassword);
    console.log('  passwordHash长度:', testUser.passwordHash.length);
    
    // 测试旧密码验证
    const oldPasswordValid = await bcrypt.compare(testUser.plainPassword, testUser.passwordHash);
    console.log('  旧密码验证:', oldPasswordValid ? '成功' : '失败');
    
    // 修改密码
    const newPassword = 'newpassword123';
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        passwordHash: newPasswordHash,
        plainPassword: newPassword
      }
    });
    
    // 检查修改后的结果
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    
    console.log('\n修改后:');
    console.log('  plainPassword:', updatedUser.plainPassword);
    console.log('  passwordHash长度:', updatedUser.passwordHash.length);
    
    // 验证新密码
    const newPasswordValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
    console.log('  新密码验证:', newPasswordValid ? '成功' : '失败');
    
    // 验证旧密码是否还能用（应该失败）
    const oldPasswordStillValid = await bcrypt.compare(testUser.plainPassword, updatedUser.passwordHash);
    console.log('  旧密码验证:', oldPasswordStillValid ? '仍然有效（异常）' : '已失效（正常）');
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPasswordUpdate();