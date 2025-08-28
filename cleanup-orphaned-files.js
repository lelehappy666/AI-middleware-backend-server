import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function cleanupOrphanedFiles() {
  try {
    console.log('开始清理孤立的文件记录...');
    
    // 获取所有文件记录
    const files = await prisma.file.findMany({
      select: {
        id: true,
        originalName: true,
        filename: true,
        filePath: true
      }
    });
    
    console.log(`数据库中共有 ${files.length} 个文件记录`);
    
    if (files.length === 0) {
      console.log('数据库中没有文件记录，无需清理');
      return;
    }
    
    let orphanedCount = 0;
    let existingFilesCount = 0;
    const orphanedIds = [];
    const warnings = [];
    
    console.log('\n正在检查文件记录与物理文件的一致性...');
    
    // 检查每个文件记录对应的物理文件是否存在
    for (const file of files) {
      const filePath = file.filePath;
      const absolutePath = path.resolve(filePath);
      
      console.log(`\n检查文件: ${file.originalName}`);
      console.log(`  数据库ID: ${file.id}`);
      console.log(`  存储文件名: ${file.filename}`);
      console.log(`  文件路径: ${filePath}`);
      console.log(`  绝对路径: ${absolutePath}`);
      
      if (!fs.existsSync(absolutePath)) {
        console.log(`  ❌ 物理文件不存在`);
        console.log(`  → 标记为孤立记录，将被删除`);
        orphanedIds.push(file.id);
        orphanedCount++;
      } else {
        console.log(`  ✅ 物理文件存在`);
        existingFilesCount++;
        
        // 检查文件大小和其他属性
        try {
          const stats = fs.statSync(absolutePath);
          console.log(`  文件大小: ${stats.size} 字节`);
          console.log(`  修改时间: ${stats.mtime}`);
        } catch (error) {
          warnings.push(`无法读取文件 ${file.originalName} 的详细信息: ${error.message}`);
          console.log(`  ⚠️  无法读取文件详细信息: ${error.message}`);
        }
      }
    }
    
    console.log('\n=== 检查结果汇总 ===');
    console.log(`数据库记录总数: ${files.length}`);
    console.log(`物理文件存在: ${existingFilesCount}`);
    console.log(`孤立记录数量: ${orphanedCount}`);
    
    if (warnings.length > 0) {
      console.log('\n⚠️  警告信息:');
      warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    if (orphanedCount === 0) {
      console.log('\n✅ 没有发现孤立记录，数据库与文件系统状态一致');
      return;
    }
    
    // 询问用户是否确认删除
    console.log('\n准备删除以下孤立记录:');
    orphanedIds.forEach((id, index) => {
      const file = files.find(f => f.id === id);
      console.log(`${index + 1}. ${file.originalName} (ID: ${id})`);
    });
    
    console.log('\n正在删除孤立记录...');
    
    // 删除孤立记录
    const deleteResult = await prisma.file.deleteMany({
      where: {
        id: {
          in: orphanedIds
        }
      }
    });
    
    console.log(`✅ 成功删除 ${deleteResult.count} 个孤立记录`);
    
    // 验证清理结果
    const remainingFiles = await prisma.file.count();
    console.log(`数据库中剩余文件记录: ${remainingFiles}`);
    
    if (remainingFiles === 0) {
      console.log('✅ 数据库已清理完成，所有孤立记录已删除');
    }
    
  } catch (error) {
    console.error('清理孤立文件记录时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedFiles();