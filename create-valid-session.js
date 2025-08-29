import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function createValidSession() {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    
    // 查找超级管理员用户
    const adminUser = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true
      }
    });
    
    if (!adminUser) {
      console.log('❌ 未找到超级管理员用户');
      return;
    }
    
    console.log('找到超级管理员:', adminUser);
    
    // 生成唯一的JTI
    const jti = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期
    
    // 创建会话记录
    const session = await prisma.userSession.create({
      data: {
        userId: adminUser.id,
        accessTokenJti: jti,
        refreshTokenHash: 'dummy-refresh-token-hash', // 临时值
        ipAddress: '127.0.0.1',
        userAgent: 'API-Test',
        deviceInfo: 'Test Device',
        isActive: true,
        expiresAt: expiresAt,
        lastUsedAt: new Date()
      }
    });
    
    console.log('创建会话:', session);
    
    // 生成JWT令牌
    const payload = {
      userId: adminUser.id,
      username: adminUser.username,
      role: adminUser.role,
      jti: jti
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    console.log('\n=== 有效的JWT令牌 ===');
    console.log(token);
    
    console.log('\n=== 测试API命令 ===');
    console.log(`Invoke-RestMethod -Uri 'http://localhost:3001/api/users/2' -Method PUT -Headers @{'Authorization'='Bearer ${token}'; 'Content-Type'='application/json'} -Body '{"password":"apitest123"}'`);
    
  } catch (error) {
    console.error('创建会话时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createValidSession();