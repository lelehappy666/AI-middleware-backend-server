import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFiles() {
  try {
    console.log('正在检查数据库中的文件记录...');
    
    // 获取所有文件记录
    const files = await prisma.file.findMany({
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        fileSize: true,
        filePath: true,
        isPublic: true,
        createdAt: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n数据库中共有 ${files.length} 个文件记录:`);
    
    if (files.length === 0) {
      console.log('❌ 数据库中没有任何文件记录');
    } else {
      files.forEach((file, index) => {
        console.log(`\n文件 ${index + 1}:`);
        console.log(`  ID: ${file.id}`);
        console.log(`  原始文件名: ${file.originalName}`);
        console.log(`  存储文件名: ${file.filename}`);
        console.log(`  文件类型: ${file.mimeType}`);
        console.log(`  文件大小: ${file.fileSize.toString()} 字节`);
        console.log(`  存储路径: ${file.filePath}`);
        console.log(`  是否公开: ${file.isPublic ? '是' : '否'}`);
        console.log(`  上传时间: ${file.createdAt}`);
        console.log(`  上传者: ${file.uploader.name} (${file.uploader.email})`);
      });
    }
    
    // 检查文件总数统计
    const totalCount = await prisma.file.count();
    console.log(`\n文件总数统计: ${totalCount}`);
    
  } catch (error) {
    console.error('检查文件记录时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFiles();