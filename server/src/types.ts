/**
 * Cloudflare 账号配置
 */
export interface ICloudflareConfig {
  /** Cloudflare 账号 ID */
  accountId: string;
  /** Cloudflare API 令牌 */
  apiToken: string;
}

/**
 * 系统配置
 */
export interface ISystemConfig {
  /** 连接协议: http2 或 quic */
  protocol: 'http2' | 'quic';
  /** 边缘节点 IP 版本: 4 或 6 */
  edgeIpVersion: '4' | '6';
  /** 系统启动时自动连接 */
  autoConnectOnBoot: boolean;
}

/**
 * Tunnel 信息（来自 Cloudflare API）
 */
export interface ITunnel {
  /** Tunnel ID */
  id: string;
  /** Tunnel 名称 */
  name: string;
  /** 状态: healthy / degraded / inactive / down */
  status: string;
  /** 创建时间 */
  created_at: string;
  /** 连接数 */
  connections?: unknown[];
}

/**
 * Ingress 规则（域名到本地服务的映射）
 */
export interface IIngressRule {
  /** 域名，如 subs.niubige.top */
  hostname: string;
  /** 本地服务地址，如 http://192.168.1.2:8299 */
  service: string;
  /** 可选路径前缀过滤 */
  path?: string;
}

/**
 * Tunnel 配置（ingress 规则列表）
 */
export interface ITunnelConfig {
  /** ingress 规则列表 */
  ingress: IIngressRule[];
}

/**
 * 本地保存的当前运行的 Tunnel 信息
 */
export interface ITunnelInfo {
  /** Tunnel ID */
  tunnelId: string;
  /** Tunnel Token */
  token: string;
  /** 启动时间戳 */
  startAt: number;
}

/**
 * API 统一响应格式
 */
export interface IApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Cloudflare API 响应格式
 */
export interface ICloudflareApiResponse<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

/**
 * DNS 记录创建请求
 */
export interface IDnsRecordRequest {
  /** 完整域名，如 subs.niubige.top */
  hostname: string;
  /** Tunnel ID */
  tunnelId: string;
}