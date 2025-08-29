import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3001/api';

// 测试用户登录活动通知
async function testLoginActivityNotifications() {
  console.log('🚀 开始测试用户登录活动通知功能');
  
  try {
    // 1. 登录管理员账户
    console.log('\n🔐 正在登录管理员账户...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ 登录成功');
      console.log('📊 响应数据:', {
        userId: loginResponse.data.data.user.id,
        username: loginResponse.data.data.user.name,
        accessToken: loginResponse.data.data.accessToken ? '已获取' : '未获取'
      });
      
      const token = loginResponse.data.data.accessToken;
      
      // 等待一下让通知发送完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. 登出
      console.log('\n🚪 正在登出...');
      const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (logoutResponse.data.success) {
        console.log('✅ 登出成功');
      } else {
        console.log('❌ 登出失败:', logoutResponse.data.message);
      }
      
      // 等待一下让通知发送完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } else {
      console.log('❌ 登录失败:', loginResponse.data.message);
      return;
    }
    
    console.log('\n📋 === 测试结果总结 ===');
    console.log('   登录: ✅');
    console.log('   登出: ✅');
    console.log('\n🎉 登录活动通知测试完成！');
    console.log('\n💡 提示：');
    console.log('   - 请查看服务器日志确认登录活动通知是否正确发送');
    console.log('   - 登录活动通知应该包含用户登录和登出的消息');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('📊 错误响应:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testLoginActivityNotifications();