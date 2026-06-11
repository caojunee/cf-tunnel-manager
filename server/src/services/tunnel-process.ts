import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import { getSystemConfig, CLOUDFLARED_LOG_FILE } from './config-store';
import { AppError } from '../middleware/error-handler';

/**
 * cloudflared 隧道进程管理器
 * 负责启动、停止、监控 cloudflared 子进程
 */

/** 当前运行的 cloudflared 进程 */
let currentProcess: ChildProcess | null = null;

/** 防止并发启动/停止的标志位 */
let isTransitioning = false;

/** 上一次的日志文件大小（用于增量读取） */
let lastLogSize = 0;

/**
 * 获取 cloudflared 二进制路径
 */
function getCloudflaredPath(): string {
  const arch = process.arch;
  const platform = process.platform;

  if (platform === 'linux') {
    switch (arch) {
      case 'x64':
        return '/usr/local/bin/cloudflared-linux-amd64';
      case 'arm64':
        return '/usr/local/bin/cloudflared-linux-arm64';
      case 'arm':
        return '/usr/local/bin/cloudflared-linux-arm';
      case 'ia32':
        return '/usr/local/bin/cloudflared-linux-386';
      default:
        throw new AppError(`不支持的架构: ${arch}`, 500);
    }
  } else {
    // 开发环境或其它平台，尝试使用系统 path 中的 cloudflared
    return 'cloudflared';
  }
}

/**
 * 构建额外运行参数
 */
function getExtraArgs(): string[] {
  const sysConfig = getSystemConfig();
  const args: string[] = [];

  args.push('--loglevel', 'info');
  args.push('--logfile', CLOUDFLARED_LOG_FILE);
  args.push('--edge-ip-version', sysConfig.edgeIpVersion);
  args.push('--protocol', sysConfig.protocol);

  return args;
}

/**
 * 启动 cloudflared tunnel
 * @param token - Tunnel token
 * @returns 启动成功返回 true
 */
export async function startTunnel(token: string): Promise<void> {
  if (isTransitioning) {
    throw new AppError('正在操作中，请稍候再试', 429);
  }

  // 如果已在运行，先停止
  if (currentProcess) {
    await stopTunnel();
  }

  isTransitioning = true;

  try {
    const binPath = getCloudflaredPath();
    const extraArgs = getExtraArgs();

    console.log(`[Tunnel] 启动 cloudflared: ${binPath}`);

    // 确保日志目录存在
    const logDir = require('path').dirname(CLOUDFLARED_LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    currentProcess = spawn(binPath, ['tunnel', '--no-autoupdate', ...extraArgs, 'run', '--token', token], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    // 重定向标准输出到日志
    if (currentProcess.stdout) {
      currentProcess.stdout.on('data', (data: Buffer) => {
        fs.appendFileSync(CLOUDFLARED_LOG_FILE, data.toString());
      });
    }
    if (currentProcess.stderr) {
      currentProcess.stderr.on('data', (data: Buffer) => {
        fs.appendFileSync(CLOUDFLARED_LOG_FILE, data.toString());
      });
    }

    currentProcess.on('exit', (code, signal) => {
      console.log(`[Tunnel] 进程退出, code=${code}, signal=${signal}`);
      currentProcess = null;
      isTransitioning = false;
    });

    currentProcess.on('error', (err) => {
      console.error(`[Tunnel] 进程错误:`, err);
      currentProcess = null;
      isTransitioning = false;
    });

    // 等待一小段时间确认进程启动
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (currentProcess && !currentProcess.killed) {
          resolve();
        } else {
          reject(new AppError('Tunnel 进程启动失败', 500));
        }
      }, 2000);

      if (currentProcess) {
        currentProcess.on('error', () => {
          clearTimeout(timer);
          reject(new AppError('Tunnel 进程启动失败', 500));
        });
      }
    });

    console.log(`[Tunnel] 启动成功, PID=${currentProcess.pid}`);
  } catch (err) {
    isTransitioning = false;
    throw err instanceof AppError ? err : new AppError(`启动 Tunnel 失败: ${(err as Error).message}`, 500);
  } finally {
    isTransitioning = false;
  }
}

/**
 * 停止当前运行的 tunnel
 */
export async function stopTunnel(): Promise<void> {
  if (!currentProcess) {
    return; // 没有运行中的进程
  }

  isTransitioning = true;

  try {
    const pid = currentProcess.pid;
    console.log(`[Tunnel] 停止进程 PID=${pid}`);

    // 优雅停止（SIGTERM）
    currentProcess.kill('SIGTERM');

    // 等待进程退出
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[Tunnel] SIGTERM 超时，发送 SIGKILL');
        if (currentProcess && !currentProcess.killed) {
          currentProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      if (currentProcess) {
        currentProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });
  } catch (err) {
    console.error('[Tunnel] 停止失败:', err);
  } finally {
    currentProcess = null;
    isTransitioning = false;
  }
}

/**
 * 获取当前进程状态
 */
export function getTunnelStatus(): {
  running: boolean;
  pid: number | null;
} {
  return {
    running: currentProcess !== null && !currentProcess.killed,
    pid: currentProcess?.pid || null,
  };
}

/**
 * 读取 cloudflared 日志
 * @param lines - 读取行数（默认 200）
 */
export function getLogs(lines: number = 200): string[] {
  try {
    if (!fs.existsSync(CLOUDFLARED_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(CLOUDFLARED_LOG_FILE, 'utf-8');
    const allLines = content.split('\n').filter((line) => line.trim() !== '');
    return allLines.slice(-lines);
  } catch {
    return [];
  }
}

/**
 * 清空日志
 */
export function clearLogs(): void {
  if (fs.existsSync(CLOUDFLARED_LOG_FILE)) {
    fs.writeFileSync(CLOUDFLARED_LOG_FILE, '', 'utf-8');
  }
  lastLogSize = 0;
}