import { Router, Request, Response } from 'express';
import {
  findZoneByHostname,
  createDnsRecord,
  listDnsRecords,
  deleteDnsRecord,
} from '../services/cloudflare-api';
import { IApiResponse } from '../types';

const router = Router();

/**
 * POST /api/dns/record
 * 为域名创建 DNS CNAME 记录到 Tunnel
 *
 * 查询参数:
 *   ?force=true - 自动删除同名记录再创建
 *
 * 请求体:
 * {
 *   "hostname": "subs.niubige.top",
 *   "tunnelId": "dda6da49-73df-4399-9e14-a19d0d434690"
 * }
 */
router.post('/record', async (req: Request, res: Response) => {
  const { hostname, tunnelId } = req.body;
  const force = req.query.force === 'true';

  if (!hostname || !tunnelId) {
    res.status(400).json({
      success: false,
      message: '缺少 hostname 或 tunnelId',
    } as IApiResponse);
    return;
  }

  try {
    // 查找匹配的 Zone
    const zone = await findZoneByHostname(hostname);

    if (!zone) {
      res.status(400).json({
        success: false,
        message: '无法找到匹配的 Zone，请检查域名是否在您的 Cloudflare 账号下',
      } as IApiResponse);
      return;
    }

    // 查询同名 DNS 记录
    const existingRecords = await listDnsRecords(zone.zoneId, hostname);

    const expectedContent = `${tunnelId}.cfargotunnel.com`;

    if (existingRecords.length > 0) {
      // 检查是否已有指向同一 tunnel 的 CNAME 记录
      const hasCorrectCname = existingRecords.some(
        (r) => r.type === 'CNAME' && r.content === expectedContent
      );
      if (hasCorrectCname) {
        // 已存在正确记录，跳过
        res.json({
          success: true,
          message: `DNS 记录已存在，无需变更`,
          data: { zoneName: zone.zoneName },
        } as IApiResponse);
        return;
      }

      if (force) {
        // 删除所有同名记录
        for (const record of existingRecords) {
          await deleteDnsRecord(zone.zoneId, record.id);
        }
      } else {
        // 返回冲突信息，让前端决定
        res.json({
          success: false,
          conflict: true,
          message: `域名 ${hostname} 已存在 DNS 记录 (${existingRecords.map(r => r.type).join(', ')})，是否删除并重建？`,
          data: {
            existingRecords: existingRecords.map((r) => ({
              id: r.id,
              type: r.type,
              content: r.content,
            })),
          },
        } as IApiResponse & { conflict: boolean });
        return;
      }
    }

    // 创建 DNS CNAME 记录
    await createDnsRecord(zone.zoneId, hostname, tunnelId);

    res.json({
      success: true,
      message: `DNS 记录创建成功`,
      data: { zoneName: zone.zoneName },
    } as IApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : '创建 DNS 记录失败';
    res.status(500).json({ success: false, message } as IApiResponse);
  }
});

export default router;
