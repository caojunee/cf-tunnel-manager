import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ICloudflareConfig, ISystemConfig, ITunnelInfo } from '../types';

/**
 * 配置文件的默认存储路径
 */
const DEFAULT_CONFIG_DIR = process.env.CONFIG_DIR || '/data';

const CONFIG_FILE = path.join(DEFAULT_CONFIG_DIR, 'config.json');
const TUNNEL_INFO_FILE = path.join(DEFAULT_CONFIG_DIR, 'tunnel_info.json');

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 从 JSON 文件读取数据
 */
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`读取配置文件失败 [${filePath}]:`, err);
  }
  return defaultValue;
}

/**
 * 写入 JSON 文件
 */
function writeJsonFile(filePath: string, data: unknown): void {
  ensureConfigDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ========== Cloudflare 配置 ==========

/**
 * 获取 Cloudflare 账号配置
 */
export function getCloudflareConfig(): ICloudflareConfig {
  return readJsonFile<ICloudflareConfig>(CONFIG_FILE, {
    accountId: '',
    apiToken: '',
  });
}

/**
 * 保存 Cloudflare 账号配置
 */
export function saveCloudflareConfig(config: ICloudflareConfig): void {
  // 保留已有的系统配置字段
  const existing = readJsonFile<Record<string, unknown>>(CONFIG_FILE, {});
  const merged = {
    ...existing,
    accountId: config.accountId,
    apiToken: config.apiToken,
  };
  writeJsonFile(CONFIG_FILE, merged);
}

/**
 * 获取系统配置（协议、IP 版本等）
 */
export function getSystemConfig(): ISystemConfig {
  const data = readJsonFile<Partial<ISystemConfig>>(CONFIG_FILE, {});
  return {
    protocol: data.protocol || 'http2',
    edgeIpVersion: data.edgeIpVersion || '4',
    autoConnectOnBoot: data.autoConnectOnBoot !== false,
  };
}

/**
 * 保存系统配置
 */
export function saveSystemConfig(config: ISystemConfig): void {
  const existing = readJsonFile<Record<string, unknown>>(CONFIG_FILE, {});
  const merged = {
    ...existing,
    protocol: config.protocol,
    edgeIpVersion: config.edgeIpVersion,
    autoConnectOnBoot: config.autoConnectOnBoot,
  };
  writeJsonFile(CONFIG_FILE, merged);
}

/**
 * 获取 Cloudflare 配置值（accountId 和 apiToken），用于内部调用
 */
export function getCloudflareCredentials(): { accountId: string; apiToken: string } {
  const config = getCloudflareConfig();
  return { accountId: config.accountId, apiToken: config.apiToken };
}

// ========== Tunnel 信息 ==========

/**
 * 检测系统是否支持 IPv6（是否有公网可达的全球单播 IPv6 地址）
 */
export function checkIPv6Support(): boolean {
  try {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const addr of iface) {
        // family 在 Node.js 18+ 返回 'IPv6' 字符串
        // 排除链路本地 (fe80::) 和 loopback (::1)
        if (
          addr.family === 'IPv6' &&
          !addr.internal &&
          !addr.address.startsWith('fe80')
        ) {
          return true;
        }
      }
    }
  } catch {
    // 检测失败时保守返回 false
  }
  return false;
}

export function getTunnelInfo(): ITunnelInfo | null {
  return readJsonFile<ITunnelInfo | null>(TUNNEL_INFO_FILE, null);
}

/**
 * 保存当前运行的 Tunnel 信息
 */
export function saveTunnelInfo(info: ITunnelInfo): void {
  writeJsonFile(TUNNEL_INFO_FILE, info);
}

/**
 * 清除 Tunnel 信息
 */
export function clearTunnelInfo(): void {
  if (fs.existsSync(TUNNEL_INFO_FILE)) {
    fs.unlinkSync(TUNNEL_INFO_FILE);
  }
}

// ========== 日志文件路径 ==========

/** cloudflared 输出日志路径 */
export const CLOUDFLARED_LOG_FILE = path.join(DEFAULT_CONFIG_DIR, 'cloudflared.log');
/** 原 cloudflared 标准输出重定向日志 */
export const CLOUDFLARED_NOHUP_FILE = path.join(DEFAULT_CONFIG_DIR, 'cloudflared-nohup.log');