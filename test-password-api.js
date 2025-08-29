import fetch from 'node-fetch';

async function testPasswordAPI() {
  try {
    console.log('测试超级管理员获取用户密码功能...');
    
    // 1. 先登录获取token
    console.log('1. 登录超级管理员账户...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      console.error('登录失败:', loginData.error);
      return;
    }
    
    const token = loginData.data.accessToken;
    console.log('登录成功，获取到token');
    
    // 2. 获取用户列表
    console.log('\n2. 获取用户列表...');
    const usersResponse = await fetch('http://localhost:3001/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const usersData = await usersResponse.json();
    if (!usersData.success) {
      console.error('获取用户列表失败:', usersData.error);
      return;
    }
    
    const users = usersData.data.users;
    console.log(`找到 ${users.length} 个用户`);
    
    // 3. 测试获取每个用户的密码
    console.log('\n3. 测试获取用户密码...');
    for (const user of users.slice(0, 3)) { // 只测试前3个用户
      console.log(`\n测试用户: ${user.name} (ID: ${user.id})`);
      
      const passwordResponse = await fetch(`http://localhost:3001/api/users/${user.id}/password`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const passwordData = await passwordResponse.json();
      if (passwordData.success) {
        console.log(`✅ 成功获取密码: ${passwordData.data.password}`);
      } else {
        console.log(`❌ 获取密码失败: ${passwordData.error}`);
      }
    }
    
    console.log('\n测试完成！');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

testPasswordAPI();