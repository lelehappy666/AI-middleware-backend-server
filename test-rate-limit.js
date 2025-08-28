import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

console.log('当前速率限制配置:');
console.log('RATE_LIMIT_WINDOW_MS:', process.env.RATE_LIMIT_WINDOW_MS || '900000');
console.log('RATE_LIMIT_MAX_REQUESTS:', process.env.RATE_LIMIT_MAX_REQUESTS || '500');
console.log('解析后的值:');
console.log('窗口时间(ms):', parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'));
console.log('最大请求数:', parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'));
console.log('文件上传限制:', parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500') * 2);