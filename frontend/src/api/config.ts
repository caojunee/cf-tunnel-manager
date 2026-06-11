import { get, post, put } from './request';
import type { ICloudflareConfig, ISystemConfig } from '../types';

/**
 * 获取 Cloudflare 配置 + 系统配置
 */
export function fetchCloudflareConfig() {
  return get<ICloudflareConfig & ISystemConfig>('/cloudflare/config');
}

/**
 * 保存 Cloudflare 配置
 */
export function saveCloudflareConfig(data: ICloudflareConfig) {
  return post('/cloudflare/config', data);
}

/**
 * 测试 Cloudflare 凭证
 */
export function testCloudflareConfig(data: ICloudflareConfig) {
  return post('/cloudflare/test', data);
}

/**
 * 获取系统配置
 */
export function fetchSystemConfig() {
  return get<ISystemConfig>('/system/config');
}

/**
 * 更新系统配置
 */
export function updateSystemConfig(data: ISystemConfig) {
  return put('/system/config', data);
}