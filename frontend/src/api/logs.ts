import { get, del } from './request';

/**
 * 获取日志
 */
export function fetchLogs() {
  return get<string[]>('/logs');
}

/**
 * 清空日志
 */
export function clearLogs() {
  return del('/logs');
}