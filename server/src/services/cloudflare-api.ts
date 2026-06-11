import { getCloudflareCredentials } from './config-store';
import { AppError } from '../middleware/error-handler';
import type {
  ICloudflareApiResponse,
  ITunnel,
  ITunnelConfig,
  ICloudflareConfig,
} from '../types';

/** Cloudflare API 基础地址 */
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * 生成请求头
 */
function getHeaders(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 获取凭证并校验
 */
function getCredentials(): { accountId: string; apiToken: string } {
  const creds = getCloudflareCredentials();
  if (!creds.accountId || !creds.apiToken) {
    throw new AppError('请先配置 Cloudflare 账号信息', 400);
  }
  return creds;
}

/**
 * 发送 Cloudflare API 请求并解析响应
 */
async function cfRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const { accountId, apiToken } = getCredentials();
  // 替换路径中的 {accountId}
  const resolvedPath = path.replace('{accountId}', accountId);
  const url = `${CF_API_BASE}${resolvedPath}`;

  const options: RequestInit = {
    method,
    headers: getHeaders(apiToken),
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    throw new AppError(`连接 Cloudflare API 失败: ${(err as Error).message}`, 502);
  }

  const data: ICloudflareApiResponse<T> = await response.json();

  if (!data.success) {
    const errorMsg = data.errors?.[0]?.message || 'Cloudflare API 请求失败';
    throw new AppError(errorMsg, response.status);
  }

  return data.result;
}

// ==================== 对外 API 方法 ====================

/**
 * 验证 API Token 是否有效
 */
export async function verifyToken(): Promise<boolean> {
  const { apiToken } = getCredentials();
  try {
    const response = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
      method: 'GET',
      headers: getHeaders(apiToken),
    });
    const data: ICloudflareApiResponse<unknown> = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

/**
 * 验证配置（Token + 账号匹配）
 */
export async function validateConfig(config: ICloudflareConfig): Promise<string | null> {
  try {
    // 验证 Token
    const verifyResp = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    const verifyData: ICloudflareApiResponse<unknown> = await verifyResp.json();
    if (!verifyData.success) {
      const msg = (verifyData.errors?.[0]?.message) || 'Token 校验失败';
      return msg;
    }

    // 验证 Account ID
    const tunnelResp = await fetch(
      `${CF_API_BASE}/accounts/${config.accountId}/cfd_tunnel?per_page=1`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const tunnelData: ICloudflareApiResponse<unknown> = await tunnelResp.json();
    if (!tunnelData.success) {
      return 'Account ID 不正确或 Token 权限不足';
    }

    return null; // 验证通过
  } catch (err) {
    return `验证失败: ${(err as Error).message}`;
  }
}

/**
 * 获取 Tunnel 列表
 */
export async function listTunnels(): Promise<ITunnel[]> {
  return cfRequest<ITunnel[]>('GET', '/accounts/{accountId}/cfd_tunnel');
}

/**
 * 创建 Tunnel
 */
export async function createTunnel(name: string): Promise<ITunnel> {
  return cfRequest<ITunnel>('POST', '/accounts/{accountId}/cfd_tunnel', { name });
}

/**
 * 删除 Tunnel
 */
export async function deleteTunnel(tunnelId: string): Promise<void> {
  await cfRequest<unknown>('DELETE', `/accounts/{accountId}/cfd_tunnel/${tunnelId}`);
}

/**
 * 获取 Tunnel Token
 */
export async function getTunnelToken(tunnelId: string): Promise<string> {
  return cfRequest<string>('GET', `/accounts/{accountId}/cfd_tunnel/${tunnelId}/token`);
}

/**
 * 获取 Tunnel 配置（ingress 规则）
 */
export async function getTunnelConfig(tunnelId: string): Promise<ITunnelConfig | null> {
  try {
    const result = await cfRequest<{ config?: ITunnelConfig }>(
      'GET',
      `/accounts/{accountId}/cfd_tunnel/${tunnelId}/configurations`
    );
    return result.config || null;
  } catch {
    return null;
  }
}

/**
 * 更新 Tunnel 配置（ingress 规则）
 * @param tunnelId - Tunnel ID
 * @param ingress - ingress 规则列表（会自动追加 404 fallback）
 */
export async function updateTunnelConfig(
  tunnelId: string,
  ingress: Array<{ hostname: string; service: string; path?: string }>
): Promise<void> {
  // Cloudflare 要求最后一条规则必须是 404 fallback
  // 注意: ingress 规则的 service 不支持路径后缀（trailing slash 也不行）
  const ingressWithFallback = [
    ...ingress.map((r) => ({
      hostname: r.hostname,
      service: r.service.replace(/\/+$/, ''),
      ...(r.path ? { path: r.path } : {}),
    })),
    { service: 'http_status:404' },
  ];

  await cfRequest<unknown>(
    'PUT',
    `/accounts/{accountId}/cfd_tunnel/${tunnelId}/configurations`,
    { config: { ingress: ingressWithFallback } }
  );
}

/**
 * 获取 Zone 列表
 */
export async function getZones(): Promise<Array<{ id: string; name: string }>> {
  return cfRequest<Array<{ id: string; name: string }>>('GET', '/zones');
}

/**
 * 根据域名查找匹配的 Zone（取最长匹配）
 */
export async function findZoneByHostname(
  hostname: string
): Promise<{ zoneId: string; zoneName: string } | null> {
  const zones = await getZones();
  let bestMatch: { zoneId: string; zoneName: string } | null = null;
  let maxLen = 0;

  for (const zone of zones) {
    if (hostname.endsWith(zone.name) && zone.name.length > maxLen) {
      maxLen = zone.name.length;
      bestMatch = { zoneId: zone.id, zoneName: zone.name };
    }
  }

  return bestMatch;
}

/**
 * 创建 DNS CNAME 记录
 */
export async function createDnsRecord(
  zoneId: string,
  hostname: string,
  tunnelId: string
): Promise<void> {
  const response = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/dns_records`,
    {
      method: 'POST',
      headers: getHeaders(getCredentials().apiToken),
      body: JSON.stringify({
        type: 'CNAME',
        name: hostname,
        content: `${tunnelId}.cfargotunnel.com`,
        ttl: 1,
        proxied: true,
      }),
    }
  );
  const data: ICloudflareApiResponse<unknown> = await response.json();
  if (!data.success) {
    throw new AppError(data.errors?.[0]?.message || '创建 DNS 记录失败', 400);
  }
}

/**
 * 查询指定 Zone 下与 hostname 同名的 DNS 记录
 */
export async function listDnsRecords(
  zoneId: string,
  hostname: string
): Promise<Array<{ id: string; type: string; name: string; content: string }>> {
  const result = await cfRequest<
    Array<{ id: string; type: string; name: string; content: string }>
  >('GET', `/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}`);
  return result;
}

/**
 * 删除 DNS 记录
 */
export async function deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
  await cfRequest<unknown>('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
}