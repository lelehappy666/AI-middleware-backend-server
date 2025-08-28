import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

// 根据文件扩展名推断正确的MIME类型
function getMimeTypeByExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypeMap = {
    // 图片格式
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    
    // 视频格式
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.3gp': 'video/3gpp',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.m4v': 'video/mp4'
  };
  
  return mimeTypeMap[ext] || null;
}

// 判断文件类型
function getFileCategory(mimeType) {
  if (mimeType.startsWith('image/')) {
    return 'IMAGE';
  } else if (mimeType.startsWith('video/')) {
    return 'VIDEO';
  }
  return 'OTHER';
}

async function fixMimeTypes() {
  try {
    console.log('🔍 开始检查和修复数据库中的MIME类型...');
    
    // 获取所有文件记录
    const files = await prisma.file.findMany({
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        filePath: true
      }
    });
    
    console.log(`📊 数据库中共有 ${files.length} 个文件记录`);
    
    if (files.length === 0) {
      console.log('❌ 数据库中没有文件记录');
      return;
    }
    
    let fixedCount = 0;
    let imageCount = 0;
    let videoCount = 0;
    let otherCount = 0;
    
    console.log('\n📋 文件类型分析:');
    
    for (const file of files) {
      const correctMimeType = getMimeTypeByExtension(file.originalName);
      const currentCategory = getFileCategory(file.mimeType);
      
      console.log(`\n文件: ${file.originalName}`);
      console.log(`  当前MIME类型: ${file.mimeType}`);
      console.log(`  推断MIME类型: ${correctMimeType || '未知'}`);
      console.log(`  当前分类: ${currentCategory}`);
      
      // 统计分类
      if (currentCategory === 'IMAGE') {
        imageCount++;
      } else if (currentCategory === 'VIDEO') {
        videoCount++;
      } else {
        otherCount++;
      }
      
      // 如果推断的MIME类型与当前不同，则更新
      if (correctMimeType && correctMimeType !== file.mimeType) {
        console.log(`  ⚠️  MIME类型不匹配，需要修复`);
        
        try {
          await prisma.file.update({
            where: { id: file.id },
            data: { mimeType: correctMimeType }
          });
          
          console.log(`  ✅ 已修复: ${file.mimeType} -> ${correctMimeType}`);
          fixedCount++;
        } catch (error) {
          console.error(`  ❌ 修复失败:`, error.message);
        }
      } else {
        console.log(`  ✅ MIME类型正确`);
      }
    }
    
    console.log('\n📊 统计结果:');
    console.log(`  图片文件: ${imageCount} 个`);
    console.log(`  视频文件: ${videoCount} 个`);
    console.log(`  其他文件: ${otherCount} 个`);
    console.log(`  修复文件: ${fixedCount} 个`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 MIME类型修复完成！请重新测试文件分类功能。');
    } else {
      console.log('\n✅ 所有文件的MIME类型都是正确的。');
    }
    
  } catch (error) {
    console.error('❌ 修复MIME类型时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMimeTypes();