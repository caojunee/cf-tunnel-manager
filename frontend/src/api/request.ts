import { ElMessage } from 'element-plus';
import type { IApiResponse } from '../types';

/**
 * 统一 fetch 请求封装
 * 自动处理 baseURL、JSON 序列化、错误提示
 */

/** API 基础路径 */
const BASE_URL = '/api';

/**
 * 发起 API 请求
 * @param url - 请求路径（相对于 /api）
 * @param options - 请求选项
 * @returns 响应数据
 */
export async function request<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<IApiResponse<T>> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options?.headers as Record<string, string>),
    },
  };

  try {
    const response = await fetch(`${BASE_URL}${url}`, config);

    // 尝试解析 JSON
    const data: IApiResponse<T> = await response.json();

    if (!response.ok) {
      ElMessage.error(data.message || `请求失败 (${response.status})`);
    }

    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : '网络请求失败';
    ElMessage.error(message);
    return {
      success: false,
      message,
    };
  }
}

/**
 * GET 请求
 */
export function get<T = unknown>(url: string): Promise<IApiResponse<T>> {
  return request<T>(url, { method: 'GET' });
}

/**
 * POST 请求
 */
export function post<T = unknown>(
  url: string,
  body?: unknown
): Promise<IApiResponse<T>> {
  return request<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT 请求
 */
export function put<T = unknown>(
  url: string,
  body?: unknown
): Promise<IApiResponse<T>> {
  return request<T>(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE 请求
 */
export function del<T = unknown>(url: string): Promise<IApiResponse<T>> {
  return request<T>(url, { method: 'DELETE' });
}