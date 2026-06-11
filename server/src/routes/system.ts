import { Router, Request, Response } from 'express';
import { getSystemConfig, saveSystemConfig } from '../services/config-store';
import { IApiResponse } from '../types';

const router = Router();

/**
 * GET /api/system/config
 * 获取系统配置
 */
router.get('/config', (_req: Request, res: Response) => {
  const systemConfig = getSystemConfig();
  res.json({
    success: true,
    data: systemConfig,
  } as IApiResponse);
});

/**
 * PUT /api/system/config
 * 更新系统配置（协议、IP 版本、自动连接）
 */
router.put('/config', (req: Request, res: Response) => {
  const { protocol, edgeIpVersion, autoConnectOnBoot } = req.body;

  const systemConfig = {
    protocol: protocol || 'http2',
    edgeIpVersion: edgeIpVersion || '4',
    autoConnectOnBoot: autoConnectOnBoot !== undefined ? autoConnectOnBoot : true,
  };

  saveSystemConfig(systemConfig);

  res.json({
    success: true,
    message: '系统设置保存成功',
  } as IApiResponse);
});

export default router;