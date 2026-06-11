import { Request, Response, NextFunction } from 'express';
import { IApiResponse } from '../types';

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  /** HTTP 状态码 */
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * 统一错误处理中间件
 * 捕获所有路由中抛出的错误，返回统一格式的错误响应
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 日志
  console.error(`[Error] ${err.message}`, err.stack);

  // 判断是否为 AppError
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || '服务器内部错误';

  const response: IApiResponse = {
    success: false,
    message: message,
    error: err.name,
  };

  res.status(statusCode).json(response);
}