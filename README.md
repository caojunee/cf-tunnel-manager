# Cloudflare Tunnel Manager

一个基于 Web 的 Cloudflare Tunnel 可视化管理工具，提供简洁直观的界面来管理 Tunnels、配置 Ingress 规则和自动管理 DNS 记录。

## 功能特性

- **Tunnel 管理** — 查看、创建、删除 Cloudflare Tunnels，一键连接/断开
- **Ingress 配置** — 可视化编辑域名转发规则，支持多规则管理
- **DNS 自动管理** — 保存配置时自动创建 CNAME 记录，智能检测冲突并提示覆盖
- **系统配置** — Cloudflare 账号凭据管理，连接协议（HTTP/2 / QUIC）、边缘 IP 版本选择
- **IPv6 自动检测** — 自动检测系统 IPv6 支持情况，无 IPv6 时禁用相关选项
- **开机自连** — 支持系统启动时自动连接上次使用的 Tunnel
- **终端风格日志** — 实时查看 cloudflared 日志，支持关键词筛选、自动滚动
- **Docker 部署** — 提供多阶段构建 Dockerfile，开箱即用

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript + Element Plus + Vite |
| 后端 | Express + TypeScript（tsx 运行） |
| 隧道 | cloudflared |
| 容器 | Docker 多阶段构建（基于 Node.js 20 Alpine） |

## 快速启动

### 方式一：Docker 运行（推荐）

```bash
# 1. 创建数据目录
mkdir -p ./data

# 2. 启动容器
docker compose up -d
```

访问 `http://localhost:3001` 进入管理界面。

### 方式二：Docker 直接运行

```bash
docker run -d \
  --name cf-tunnel-manager \
  -p 3001:3001 \
  -v ./data:/data \
  -e PORT=3001 \
  -e CONFIG_DIR=/data \
  -e NODE_ENV=production \
  ghcr.io/caojunee/cf-tunnel-manager:latest
```

### 方式三：本地开发

```bash
# 后端
cd server
npm install
npm run dev

# 前端（新终端）
cd frontend
npm install
npm run dev
```

前端开发服务器运行在 `http://localhost:3000`，API 请求会自动代理到后端 `3001` 端口。

## 配置说明

首次使用需要配置 Cloudflare 凭据：

1. 进入**系统配置**页面
2. 填写 Cloudflare **账号 ID** 和 **API 令牌**
3. 点击**测试配置**验证凭据有效性
4. 保存后即可开始管理 Tunnels

### API 令牌所需权限

- 账户：Cloudflare Tunnel（编辑）
- 账户：Cloudflare Tunnel（读取）
- 区域：DNS（编辑）
- 区域：DNS（读取）

## 使用流程

1. **系统配置** — 填写 Cloudflare 凭据和系统偏好
2. **Tunnel 列表** — 点击「新建 Tunnel」或使用已有 Tunnel
3. **配置链接** — 为 Tunnel 添加域名转发规则，自动创建 DNS 记录
4. **连接** — 一键连接 Tunnel，查看运行状态
5. **日志** — 实时监控 cloudflared 日志输出

## 项目结构

```
cf-tunnel-manager/
├── server/                    # 后端
│   └── src/
│       ├── index.ts           # 入口 & Express 配置
│       ├── types.ts           # 类型定义
│       ├── routes/            # API 路由
│       │   ├── cloudflare-config.ts
│       │   ├── dns.ts
│       │   ├── logs.ts
│       │   ├── system.ts
│       │   └── tunnel.ts
│       └── services/          # 业务逻辑
│           ├── cloudflare-api.ts     # Cloudflare API 封装
│           ├── config-store.ts       # 配置持久化
│           └── tunnel-process.ts     # cloudflared 进程管理
├── frontend/                  # 前端
│   └── src/
│       ├── App.vue
│       ├── main.ts
│       ├── types.ts
│       ├── api/               # API 请求封装
│       ├── router/            # Vue Router
│       └── views/             # 页面组件
│           ├── ConfigView.vue
│           ├── TunnelView.vue
│           └── LogView.vue
├── Dockerfile                 # 多阶段构建
├── docker-compose.yml
└── .github/workflows/         # CI/CD
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 服务监听端口 |
| `CONFIG_DIR` | `/data` | 配置文件存储目录 |
| `NODE_ENV` | `production` | 运行环境 |

## 许可证

MIT
