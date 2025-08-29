import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

async function debugJWTAuth() {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    console.log('JWT_SECRET:', JWT_SECRET);
    
    // 生成令牌
    const payload = {
      userId: 'admin-001',
      role: 'SUPER_ADMIN'
    };
    
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('Generated token:', token);
    
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        lockedUntil: true
      }
    });
    
    console.log('Found user:', user);
    
    if (!user) {
      console.log('❌ 用户不存在');
      return;
    }
    
    if (!user.isActive) {
      console.log('❌ 用户未激活');
      return;
    }
    
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log('❌ 用户被锁定');
      return;
    }
    
    console.log('✅ 用户验证通过');
    console.log('用户角色:', user.role);
    console.log('是否为超级管理员:', user.role === 'SUPER_ADMIN');
    console.log('是否为管理员:', ['SUPER_ADMIN', 'ADMIN'].includes(user.role));
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugJWTAuth();