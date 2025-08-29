import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function testUserUpdate() {
  try {
    console.log('🔍 开始测试用户更新功能...');
    
    // 1. 创建测试用户
    console.log('\n1. 创建测试用户...');
    const testUser = await prisma.user.create({
      data: {
        username: 'testupdate' + Date.now(),
        name: '测试用户更新',
        passwordHash: '$2b$12$test.hash.for.testing',
        plainPassword: 'testpass123',
        role: 'USER',
        isActive: true
      }
    });
    console.log('✅ 测试用户创建成功:', testUser.id, testUser.name);
    
    // 2. 通过登录API获取有效token
    console.log('\n2. 登录获取有效token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.error);
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功，获取到token');
    
    // 3. 测试API更新
    console.log('\n2. 测试API更新用户信息...');
    const updateData = {
      name: '更新后的用户名',
      role: 'USER',
      isActive: true
    };
    
    try {
      const response = await axios.put(
        `http://localhost:3001/api/users/${testUser.id}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ API响应成功:', response.data);
      
      // 4. 验证数据库是否实际更新
      console.log('\n3. 验证数据库更新...');
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
        select: {
          id: true,
          name: true,
          role: true,
          isActive: true,
          updatedAt: true
        }
      });
      
      if (!updatedUser) {
        console.log('❌ 错误: 用户在数据库中不存在');
        return;
      }
      
      console.log('📊 数据库中的用户信息:');
      console.log('  ID:', updatedUser.id);
      console.log('  姓名:', updatedUser.name);
      console.log('  角色:', updatedUser.role);
      console.log('  状态:', updatedUser.isActive);
      console.log('  更新时间:', updatedUser.updatedAt);
      
      // 5. 验证数据一致性
      console.log('\n4. 验证数据一致性...');
      const isNameUpdated = updatedUser.name === updateData.name;
      const isRoleCorrect = updatedUser.role === updateData.role;
      const isActiveCorrect = updatedUser.isActive === updateData.isActive;
      
      console.log('  姓名更新:', isNameUpdated ? '✅' : '❌', `(期望: ${updateData.name}, 实际: ${updatedUser.name})`);
      console.log('  角色正确:', isRoleCorrect ? '✅' : '❌', `(期望: ${updateData.role}, 实际: ${updatedUser.role})`);
      console.log('  状态正确:', isActiveCorrect ? '✅' : '❌', `(期望: ${updateData.isActive}, 实际: ${updatedUser.isActive})`);
      
      if (isNameUpdated && isRoleCorrect && isActiveCorrect) {
        console.log('\n🎉 测试通过: 用户更新功能正常工作，数据库已正确更新!');
      } else {
        console.log('\n❌ 测试失败: 数据库更新不一致!');
      }
      
    } catch (apiError) {
      console.log('❌ API请求失败:', apiError.response?.data || apiError.message);
      
      // 即使API失败，也检查数据库状态
      console.log('\n检查数据库状态...');
      const currentUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      console.log('数据库中的用户:', currentUser ? '存在' : '不存在');
      if (currentUser) {
        console.log('当前姓名:', currentUser.name);
      }
    }
    
    // 6. 清理测试数据
    console.log('\n5. 清理测试数据...');
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testUserUpdate();