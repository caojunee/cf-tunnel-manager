/**
 * 前端类型定义
 */

/** Cloudflare 账号配置 */
export interface ICloudflareConfig {
  /** 账号 ID */
  accountId: string;
  /** API 令牌 */
  apiToken: string;
}

/** 系统配置 */
export interface ISystemConfig {
  /** 连接协议: http2 / quic */
  protocol: 'http2' | 'quic';
  /** 边缘节点 IP 版本: 4 / 6 */
  edgeIpVersion: '4' | '6';
  /** 开机自动连接 */
  autoConnectOnBoot: boolean;
}

/** Tunnel 信息 */
export interface ITunnel {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'inactive' | 'down';
  created_at: string;
  connections?: unknown[];
}

/** Ingress 规则 */
export interface IIngressRule {
  /** 域名 */
  hostname: string;
  /** 本地服务地址 */
  service: string;
  /** 可选路径 */
  path?: string;
  /** 内部唯一 key（用于动画过渡） */
  _key?: number;
}

/** Tunnel 配置（ingress） */
export interface ITunnelConfig {
  ingress: IIngressRule[];
}

/** 当前运行的 Tunnel 信息 */
export interface ITunnelStatus {
  running: boolean;
  pid: number | null;
  tunnelId: string | null;
  startAt: number | null;
}

/** API 统一响应 */
export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/** 日志条目 */
export interface ILogEntry {
  level: string;
  time: string;
  message: string;
}

/** 连接协议选项 */
export const PROTOCOL_OPTIONS = [
  { label: 'HTTP/2（推荐）', value: 'http2' },
  { label: 'QUIC', value: 'quic' },
];

/** IP 版本选项 */
export const IP_VERSION_OPTIONS = [
  { label: 'IPv4', value: '4' },
  { label: 'IPv6（有 IPv6 建议）', value: '6' },
];

/** Tunnel 状态映射（文本） */
export const TUNNEL_STATUS_MAP: Record<string, string> = {
  healthy: '健康',
  degraded: '警告',
  inactive: '中性',
  down: '错误',
};

/** Tunnel 状态映射（Element Plus 颜色类型） */
export const TUNNEL_STATUS_COLOR: Record<string, string> = {
  healthy: 'success',
  degraded: 'warning',
  inactive: 'info',
  down: 'danger',
};