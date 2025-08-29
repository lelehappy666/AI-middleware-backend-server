import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001/api';

let authToken = '';
let testUserId = '';

// 登录获取token
async function login() {
  try {
    console.log('🔐 正在登录管理员账户...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.data.accessToken;
      console.log('✅ 登录成功');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 创建测试用户
async function createTestUser() {
  try {
    console.log('\n👤 创建测试用户...');
    const testUsername = `testuser_${Date.now()}`;
    
    const user = await prisma.user.create({
      data: {
        username: testUsername,
        name: `测试用户_${Date.now()}`,
        email: `${testUsername}@test.com`,
        passwordHash: '$2b$10$example.hash.for.testing.purposes.only',
        role: 'USER',
        isActive: true
      }
    });
    
    testUserId = user.id;
    console.log(`✅ 测试用户创建成功: ${user.name} (${user.id})`);
    return user;
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error.message);
    return null;
  }
}

// 测试用户上线通知
async function testUserOnlineNotification() {
  try {
    console.log('\n📱 测试用户上线通知...');
    const response = await axios.post(`${BASE_URL}/users/online`, {
      onlineTime: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 用户上线通知发送成功');
      console.log('📊 响应数据:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.error('❌ 用户上线通知发送失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 用户上线通知请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试用户下线通知
async function testUserOfflineNotification() {
  try {
    console.log('\n📱 测试用户下线通知...');
    const response = await axios.post(`${BASE_URL}/users/offline`, {
      offlineTime: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 用户下线通知发送成功');
      console.log('📊 响应数据:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.error('❌ 用户下线通知发送失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 用户下线通知请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 获取在线用户列表
async function getOnlineUsers() {
  try {
    console.log('\n👥 获取在线用户列表...');
    const response = await axios.get(`${BASE_URL}/notifications/online-users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 在线用户列表获取成功');
      console.log('📊 在线用户数:', response.data.data.count);
      console.log('👥 在线用户:', response.data.data.onlineUsers.map(u => `${u.name} (${u.username})`).join(', '));
      return response.data.data;
    } else {
      console.error('❌ 获取在线用户列表失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取在线用户列表请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 获取用户统计信息
async function getUserStats() {
  try {
    console.log('\n📊 获取用户统计信息...');
    const response = await axios.get(`${BASE_URL}/notifications/user-stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 用户统计信息获取成功');
      console.log('📈 总用户数:', response.data.data.totalUsers);
      console.log('🟢 在线用户数:', response.data.data.onlineUsers);
      return response.data.data;
    } else {
      console.error('❌ 获取用户统计信息失败:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 获取用户统计信息请求失败:', error.response?.data?.message || error.message);
    return null;
  }
}

// 清理测试数据
async function cleanup() {
  try {
    if (testUserId) {
      console.log('\n🧹 清理测试数据...');
      await prisma.user.delete({
        where: { id: testUserId }
      });
      console.log('✅ 测试用户已删除');
    }
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 主测试函数
async function runRealtimeNotificationTests() {
  console.log('🚀 开始测试实时通知功能\n');
  
  try {
    // 1. 登录
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log('\n❌ 测试终止：登录失败');
      return;
    }
    
    // 2. 创建测试用户
    const testUser = await createTestUser();
    if (!testUser) {
      console.log('\n❌ 测试终止：创建测试用户失败');
      return;
    }
    
    // 3. 获取初始统计信息
    console.log('\n📊 === 初始状态 ===');
    await getUserStats();
    await getOnlineUsers();
    
    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 测试用户上线通知
    console.log('\n🟢 === 测试用户上线 ===');
    const onlineSuccess = await testUserOnlineNotification();
    
    // 等待1秒让通知处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. 获取上线后的统计信息
    console.log('\n📊 === 上线后状态 ===');
    await getUserStats();
    await getOnlineUsers();
    
    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. 测试用户下线通知
    console.log('\n🔴 === 测试用户下线 ===');
    const offlineSuccess = await testUserOfflineNotification();
    
    // 等待1秒让通知处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 7. 获取下线后的统计信息
    console.log('\n📊 === 下线后状态 ===');
    await getUserStats();
    await getOnlineUsers();
    
    // 8. 总结测试结果
    console.log('\n📋 === 测试结果总结 ===');
    console.log(`   登录: ${loginSuccess ? '✅' : '❌'}`);
    console.log(`   创建测试用户: ${testUser ? '✅' : '❌'}`);
    console.log(`   用户上线通知: ${onlineSuccess ? '✅' : '❌'}`);
    console.log(`   用户下线通知: ${offlineSuccess ? '✅' : '❌'}`);
    
    if (loginSuccess && testUser && onlineSuccess && offlineSuccess) {
      console.log('\n🎉 所有测试通过！实时通知功能工作正常');
      console.log('\n💡 提示：');
      console.log('   - 用户上线/下线通知已成功发送');
      console.log('   - 在线用户数统计功能正常');
      console.log('   - 请在前端页面查看实时通知效果');
    } else {
      console.log('\n⚠️  部分测试失败，请检查实时通知功能实现');
    }
    
  } catch (error) {
    console.error('💥 测试执行出错:', error.message);
  } finally {
    // 清理测试数据
    await cleanup();
  }
}

// 运行测试
runRealtimeNotificationTests().catch(error => {
  console.error('💥 测试脚本执行失败:', error);
  process.exit(1);
});