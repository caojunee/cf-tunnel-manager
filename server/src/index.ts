import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middleware/error-handler';
import cloudflareConfigRouter from './routes/cloudflare-config';
import systemRouter from './routes/system';
import tunnelRouter from './routes/tunnel';
import dnsRouter from './routes/dns';
import logsRouter from './routes/logs';
import { getTunnelInfo, getSystemConfig } from './services/config-store';
import { startTunnel } from './services/tunnel-process';

/** 服务端口 */
const PORT = parseInt(process.env.PORT || '3001', 10);

const app = express();

// ========== 中间件 ==========

// CORS 配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON 解析
app.use(express.json({ limit: '1mb' }));

// ========== 静态文件（前端） ==========

// 生产环境下，前端编译产物在 public 目录
const publicPath = path.resolve(__dirname, '../../public');
app.use(express.static(publicPath));

// ========== API 路由 ==========

app.use('/api/cloudflare', cloudflareConfigRouter);
app.use('/api/system', systemRouter);
app.use('/api/tunnels', tunnelRouter);
app.use('/api/dns', dnsRouter);
app.use('/api/logs', logsRouter);

// ========== SPA 回退 ==========

// 非 API 路径返回前端 index.html（支持 Vue Router 历史模式）
app.get('*', (_req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ success: false, message: '前端资源未构建' });
  }
});

// ========== 错误处理 ==========

app.use(errorHandler);

// ========== 启动服务 ==========

app.listen(PORT, () => {
  console.log(`[Server] Cloudflare Tunnel Manager 服务启动成功`);
  console.log(`[Server] 监听端口: ${PORT}`);
  console.log(`[Server] API 地址: http://localhost:${PORT}/api`);
  console.log(`[Server] 前端地址: http://localhost:${PORT}`);

  // 检查是否需要自动连接上次使用的 Tunnel
  const systemConfig = getSystemConfig();
  if (systemConfig.autoConnectOnBoot) {
    const tunnelInfo = getTunnelInfo();
    if (tunnelInfo && tunnelInfo.token) {
      console.log(`[Server] 检测到 autoConnectOnBoot=true，正在自动连接 Tunnel ${tunnelInfo.tunnelId}...`);
      startTunnel(tunnelInfo.token)
        .then(() => {
          console.log(`[Server] 自动连接成功，Tunnel: ${tunnelInfo.tunnelId}`);
        })
        .catch((err) => {
          console.error(`[Server] 自动连接失败:`, err.message);
        });
    }
  }
});