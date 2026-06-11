import { get, post, del, put } from './request';
import type { ITunnel, ITunnelConfig, ITunnelStatus } from '../types';

/**
 * 获取 Tunnel 列表
 */
export function fetchTunnels() {
  return get<ITunnel[]>('/tunnels');
}

/**
 * 创建 Tunnel
 */
export function createTunnel(name: string) {
  return post<ITunnel>('/tunnels', { name });
}

/**
 * 删除 Tunnel
 */
export function removeTunnel(id: string) {
  return del(`/tunnels/${id}`);
}

/**
 * 获取 Tunnel Token
 */
export function fetchTunnelToken(id: string) {
  return get<{ token: string }>(`/tunnels/${id}/token`);
}

/**
 * 获取 Tunnel 配置（ingress）
 */
export function fetchTunnelConfig(id: string) {
  return get<ITunnelConfig>(`/tunnels/${id}/config`);
}

/**
 * 更新 Tunnel 配置（ingress）
 */
export function updateTunnelConfig(id: string, ingress: ITunnelConfig['ingress']) {
  return put(`/tunnels/${id}/config`, { ingress });
}

/**
 * 启动 Tunnel
 */
export function startTunnel(id: string) {
  return post(`/tunnels/${id}/start`);
}

/**
 * 停止 Tunnel
 */
export function stopTunnel(id: string) {
  return post(`/tunnels/${id}/stop`);
}

/**
 * 获取当前运行的 Tunnel 状态
 */
export function fetchCurrentTunnel() {
  return get<ITunnelStatus>('/tunnels/current');
}