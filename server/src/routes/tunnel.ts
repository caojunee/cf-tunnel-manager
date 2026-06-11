import { Router, Request, Response } from 'express';
import {
  listTunnels,
  createTunnel,
  deleteTunnel,
  getTunnelToken,
  getTunnelConfig,
  updateTunnelConfig,
} from '../services/cloudflare-api';
import {
  startTunnel,
  stopTunnel,
  getTunnelStatus,
} from '../services/tunnel-process';
import {
  saveTunnelInfo,
  getTunnelInfo,
  clearTunnelInfo,
} from '../services/config-store';
import { IApiResponse } from '../types';

const router = Router();

/**
 * GET /api/tunnels
 * 获取 Tunnel 列表
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tunnels = await listTunnels();
    res.json({ success: true, data: tunnels } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取 Tunnel 列表失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * POST /api/tunnels
 * 创建 Tunnel
 */
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ success: false, message: '名称不能为空' } as IApiResponse);
    return;
  }

  try {
    const tunnel = await createTunnel(name);
    res.json({ success: true, data: tunnel, message: 'Tunnel 创建成功' } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建 Tunnel 失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * DELETE /api/tunnels/:id
 * 删除 Tunnel
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await deleteTunnel(id);
    res.json({ success: true, message: 'Tunnel 删除成功' } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '删除 Tunnel 失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * GET /api/tunnels/:id/token
 * 获取 Tunnel Token
 */
router.get('/:id/token', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const token = await getTunnelToken(id);
    res.json({ success: true, data: { token } } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取 Token 失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * GET /api/tunnels/:id/config
 * 获取 Tunnel 配置（ingress 规则）
 */
router.get('/:id/config', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const config = await getTunnelConfig(id);
    res.json({
      success: true,
      data: config || { ingress: [] },
    } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取配置失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * PUT /api/tunnels/:id/config
 * 更新 Tunnel 配置（ingress 规则）
 */
router.put('/:id/config', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ingress } = req.body;

  if (!ingress || !Array.isArray(ingress)) {
    res.status(400).json({ success: false, message: 'ingress 规则不能为空' } as IApiResponse);
    return;
  }

  try {
    // 清理规则：只保留 hostname 和 service 都非空的条目，并去除 service URL 末尾斜杠
    const validRules = ingress
      .filter(
        (r: { hostname?: string; service?: string }) => r.hostname && r.service
      )
      .map((r: { hostname: string; service: string; path?: string }) => ({
        hostname: r.hostname,
        service: r.service.replace(/\/+$/, ''),
        ...(r.path ? { path: r.path } : {}),
      }));

    await updateTunnelConfig(id, validRules);
    res.json({ success: true, message: '链接配置已保存' } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '保存配置失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * POST /api/tunnels/:id/start
 * 启动 Tunnel 连接
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const token = await getTunnelToken(id);
    await startTunnel(token);

    // 保存 Tunnel 信息
    saveTunnelInfo({
      tunnelId: id,
      token,
      startAt: Math.floor(Date.now() / 1000),
    });

    res.json({ success: true, message: 'Tunnel 已连接' } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '启动 Tunnel 失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * POST /api/tunnels/:id/stop
 * 停止 Tunnel 连接
 */
router.post('/:id/stop', async (_req: Request, res: Response) => {
  try {
    await stopTunnel();
    clearTunnelInfo();
    res.json({ success: true, message: 'Tunnel 已断开' } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '停止 Tunnel 失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

/**
 * GET /api/tunnels/current
 * 获取当前运行的 Tunnel 状态（兼容旧版前端路由）
 */
router.get('/current', (_req: Request, res: Response) => {
  const status = getTunnelStatus();
  const tunnelInfo = getTunnelInfo();

  res.json({
    success: true,
    data: {
      running: status.running,
      pid: status.pid,
      tunnelId: tunnelInfo?.tunnelId || null,
      startAt: tunnelInfo?.startAt || null,
    },
  } as IApiResponse);
});

export default router;