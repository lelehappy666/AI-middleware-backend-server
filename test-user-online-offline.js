import axios from 'axios';

// 配置
const BASE_URL = 'http://localhost:3001/api';
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

// 登录获取token
async function login() {
  try {
    console.log('🔐 正在登录...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password
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

// 测试用户上线接口
async function testUserOnline() {
  try {
    console.log('\n📱 测试用户上线接口...');
    const response = await axios.post(`${BASE_URL}/users/online`, {
      onlineTime: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 用户上线接口测试成功');
      console.log('📊 响应数据:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.error('❌ 用户上线接口测试失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 用户上线接口请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 测试用户下线接口
async function testUserOffline() {
  try {
    console.log('\n📱 测试用户下线接口...');
    const response = await axios.post(`${BASE_URL}/users/offline`, {
      offlineTime: new Date().toISOString()
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ 用户下线接口测试成功');
      console.log('📊 响应数据:', JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.error('❌ 用户下线接口测试失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 用户下线接口请求失败:', error.response?.data?.message || error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试用户上下线API接口\n');
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ 测试终止：登录失败');
    return;
  }
  
  // 等待一秒
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试上线接口
  const onlineSuccess = await testUserOnline();
  
  // 等待一秒
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试下线接口
  const offlineSuccess = await testUserOffline();
  
  // 总结
  console.log('\n📋 测试结果总结:');
  console.log(`   登录: ${loginSuccess ? '✅' : '❌'}`);
  console.log(`   用户上线: ${onlineSuccess ? '✅' : '❌'}`);
  console.log(`   用户下线: ${offlineSuccess ? '✅' : '❌'}`);
  
  if (loginSuccess && onlineSuccess && offlineSuccess) {
    console.log('\n🎉 所有测试通过！用户上下线API接口工作正常');
  } else {
    console.log('\n⚠️  部分测试失败，请检查接口实现');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试执行出错:', error);
});