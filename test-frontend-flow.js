import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function testFrontendFlow() {
  try {
    console.log('🔍 开始测试前端完整流程...');
    
    // 1. 创建测试用户
    console.log('\n1. 创建测试用户...');
    const testUser = await prisma.user.create({
      data: {
        username: 'frontendtest' + Date.now(),
        name: '前端测试用户',
        passwordHash: '$2b$12$test.hash.for.testing',
        plainPassword: 'testpass123',
        role: 'USER',
        isActive: true
      }
    });
    console.log('✅ 测试用户创建成功:', testUser.id, testUser.name);
    
    // 2. 模拟前端登录流程
    console.log('\n2. 模拟前端登录...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('登录失败: ' + loginResponse.data.error);
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ 登录成功');
    
    // 3. 模拟前端获取用户列表
    console.log('\n3. 获取用户列表...');
    const getUsersResponse = await axios.get('http://localhost:3001/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getUsersResponse.data.success) {
      throw new Error('获取用户列表失败: ' + getUsersResponse.data.error);
    }
    
    const usersBefore = getUsersResponse.data.data.users;
    const targetUser = usersBefore.find(u => u.id === testUser.id);
    
    if (!targetUser) {
      throw new Error('在用户列表中找不到测试用户');
    }
    
    console.log('✅ 找到测试用户:', targetUser.name);
    console.log('  更新前状态:', {
      name: targetUser.name,
      role: targetUser.role,
      isActive: targetUser.isActive
    });
    
    // 4. 模拟前端更新用户
    console.log('\n4. 更新用户信息...');
    const updateData = {
      name: '前端更新后的用户名',
      role: 'USER',
      isActive: true
    };
    
    const updateResponse = await axios.put(
      `http://localhost:3001/api/users/${testUser.id}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!updateResponse.data.success) {
      throw new Error('更新用户失败: ' + updateResponse.data.error);
    }
    
    console.log('✅ API更新响应:', updateResponse.data.message);
    console.log('  API返回的用户数据:', updateResponse.data.data.user);
    
    // 5. 模拟前端重新获取用户列表（模拟fetchUsers）
    console.log('\n5. 重新获取用户列表（模拟前端刷新）...');
    const refreshResponse = await axios.get('http://localhost:3001/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!refreshResponse.data.success) {
      throw new Error('刷新用户列表失败: ' + refreshResponse.data.error);
    }
    
    const usersAfter = refreshResponse.data.data.users;
    const updatedUser = usersAfter.find(u => u.id === testUser.id);
    
    if (!updatedUser) {
      throw new Error('刷新后在用户列表中找不到测试用户');
    }
    
    console.log('✅ 刷新后的用户数据:', {
      name: updatedUser.name,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt
    });
    
    // 6. 验证数据库状态
    console.log('\n6. 验证数据库实际状态...');
    const dbUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });
    
    if (!dbUser) {
      throw new Error('数据库中找不到用户');
    }
    
    console.log('📊 数据库中的实际数据:', {
      name: dbUser.name,
      role: dbUser.role,
      isActive: dbUser.isActive,
      updatedAt: dbUser.updatedAt
    });
    
    // 7. 全面对比验证
    console.log('\n7. 数据一致性验证...');
    const apiName = updateResponse.data.data.user.name;
    const listName = updatedUser.name;
    const dbName = dbUser.name;
    
    const apiRole = updateResponse.data.data.user.role;
    const listRole = updatedUser.role;
    const dbRole = dbUser.role;
    
    const apiActive = updateResponse.data.data.user.isActive;
    const listActive = updatedUser.isActive;
    const dbActive = dbUser.isActive;
    
    console.log('  姓名一致性:');
    console.log('    API响应:', apiName, apiName === updateData.name ? '✅' : '❌');
    console.log('    列表数据:', listName, listName === updateData.name ? '✅' : '❌');
    console.log('    数据库:', dbName, dbName === updateData.name ? '✅' : '❌');
    
    console.log('  角色一致性:');
    console.log('    API响应:', apiRole, apiRole === updateData.role ? '✅' : '❌');
    console.log('    列表数据:', listRole, listRole === updateData.role ? '✅' : '❌');
    console.log('    数据库:', dbRole, dbRole === updateData.role ? '✅' : '❌');
    
    console.log('  状态一致性:');
    console.log('    API响应:', apiActive, apiActive === updateData.isActive ? '✅' : '❌');
    console.log('    列表数据:', listActive, listActive === updateData.isActive ? '✅' : '❌');
    console.log('    数据库:', dbActive, dbActive === updateData.isActive ? '✅' : '❌');
    
    const allConsistent = (
      apiName === listName && listName === dbName && dbName === updateData.name &&
      apiRole === listRole && listRole === dbRole && dbRole === updateData.role &&
      apiActive === listActive && listActive === dbActive && dbActive === updateData.isActive
    );
    
    if (allConsistent) {
      console.log('\n🎉 测试通过: 前端流程完全正常，所有数据保持一致!');
    } else {
      console.log('\n❌ 测试失败: 发现数据不一致问题!');
    }
    
    // 8. 清理测试数据
    console.log('\n8. 清理测试数据...');
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message || error);
    if (error.response) {
      console.error('  响应状态:', error.response.status);
      console.error('  响应数据:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testFrontendFlow();