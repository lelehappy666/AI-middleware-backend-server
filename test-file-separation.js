import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFileSeparation() {
  try {
    console.log('🧪 测试文件分类功能...');
    
    // 测试图片文件筛选
    const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/ico', 'image/x-icon'];
    const imageFiles = await prisma.file.findMany({
      where: {
        mimeType: {
          in: imageMimeTypes
        }
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true
      }
    });
    
    console.log('📷 图片文件查询结果:');
    console.log(`  总数: ${imageFiles.length}`);
    imageFiles.forEach(file => {
      console.log(`  - ${file.originalName} (${file.mimeType})`);
    });
    
    // 测试视频文件筛选
    const videoMimeTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/mkv', 'video/x-msvideo', 'video/webm', 'video/ogg', 'video/3gpp', 'video/x-flv', 'video/x-ms-wmv'];
    const videoFiles = await prisma.file.findMany({
      where: {
        mimeType: {
          in: videoMimeTypes
        }
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true
      }
    });
    
    console.log('\n🎥 视频文件查询结果:');
    console.log(`  总数: ${videoFiles.length}`);
    videoFiles.forEach(file => {
      console.log(`  - ${file.originalName} (${file.mimeType})`);
    });
    
    // 检查是否有重叠
    const imageIds = new Set(imageFiles.map(f => f.id));
    const videoIds = new Set(videoFiles.map(f => f.id));
    const overlap = [...imageIds].filter(id => videoIds.has(id));
    
    console.log('\n🔍 分离测试结果:');
    if (overlap.length === 0) {
      console.log('✅ 文件分类正确，图片和视频完全分离');
    } else {
      console.log('❌ 发现重叠文件:', overlap);
    }
    
    // 获取所有文件总数
    const totalFiles = await prisma.file.count();
    console.log(`\n📊 统计信息:`);
    console.log(`  总文件数: ${totalFiles}`);
    console.log(`  图片文件: ${imageFiles.length}`);
    console.log(`  视频文件: ${videoFiles.length}`);
    console.log(`  其他文件: ${totalFiles - imageFiles.length - videoFiles.length}`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFileSeparation();