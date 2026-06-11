import { Router, Request, Response } from 'express';
import { getLogs, clearLogs } from '../services/tunnel-process';
import { IApiResponse } from '../types';

const router = Router();

/**
 * GET /api/logs
 * 获取 cloudflared 运行日志（最近 200 条）
 */
router.get('/', (_req: Request, res: Response) => {
  const logs = getLogs(200);
  res.json({
    success: true,
    data: logs,
  } as IApiResponse);
});

/**
 * DELETE /api/logs
 * 清空 cloudflared 日志
 */
router.delete('/', (_req: Request, res: Response) => {
  clearLogs();
  res.json({
    success: true,
    message: '日志已清空',
  } as IApiResponse);
});

export default router;