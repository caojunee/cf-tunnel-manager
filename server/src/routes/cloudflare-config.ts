import { Router, Request, Response } from 'express';
import {
  getCloudflareConfig,
  saveCloudflareConfig,
  getSystemConfig,
  saveSystemConfig,
  checkIPv6Support,
} from '../services/config-store';
import { validateConfig } from '../services/cloudflare-api';
import { IApiResponse } from '../types';

const router = Router();

/**
 * GET /api/cloudflare/config
 * 获取 Cloudflare 账号配置和系统配置
 */
router.get('/config', (_req: Request, res: Response) => {
  const cloudflareConfig = getCloudflareConfig();
  const systemConfig = getSystemConfig();

  const response: IApiResponse = {
    success: true,
    data: {
      ...cloudflareConfig,
      ...systemConfig,
      hasIPv6: checkIPv6Support(),
    },
  };
  res.json(response);
});

/**
 * POST /api/cloudflare/config
 * 保存 Cloudflare 账号配置（含验证）
 */
router.post('/config', async (req: Request, res: Response) => {
  const { accountId, apiToken } = req.body;

  if (!accountId || !apiToken) {
    res.status(400).json({
      success: false,
      message: 'accountId 与 apiToken 不能为空',
    } as IApiResponse);
    return;
  }

  // 验证配置
  const errorMsg = await validateConfig({ accountId, apiToken });
  if (errorMsg) {
    res.status(400).json({
      success: false,
      message: `配置验证失败：${errorMsg}`,
    } as IApiResponse);
    return;
  }

  saveCloudflareConfig({ accountId, apiToken });

  res.json({
    success: true,
    message: '配置保存成功',
  } as IApiResponse);
});

/**
 * POST /api/cloudflare/test
 * 测试 Cloudflare 凭证有效性
 */
router.post('/test', async (req: Request, res: Response) => {
  const { accountId, apiToken } = req.body;

  if (!accountId || !apiToken) {
    res.status(400).json({
      success: false,
      message: 'accountId 与 apiToken 不能为空',
    } as IApiResponse);
    return;
  }

  const errorMsg = await validateConfig({ accountId, apiToken });
  if (errorMsg) {
    res.status(400).json({
      success: false,
      message: errorMsg,
    } as IApiResponse);
    return;
  }

  res.json({
    success: true,
    message: '验证通过',
  } as IApiResponse);
});

/**
 * GET /api/system/config
 * 获取系统配置
 */
router.get('/system/config', (_req: Request, res: Response) => {
  const systemConfig = getSystemConfig();
  res.json({
    success: true,
    data: systemConfig,
  } as IApiResponse);
});

/**
 * PUT /api/system/config
 * 更新系统配置
 */
router.put('/system/config', (req: Request, res: Response) => {
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