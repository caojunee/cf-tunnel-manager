# ========================================
# Stage 1: 构建前端
# ========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./
COPY frontend/package-lock.json ./

RUN npm ci

COPY frontend/ .

RUN npx vite build

# ========================================
# Stage 2: 构建后端运行镜像
# ========================================
FROM node:20-alpine

# 安装运行时依赖：cloudflared
RUN apk add --no-cache curl && \
    curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared && \
    apk del curl

WORKDIR /app/server

# 安装后端依赖
COPY server/package.json ./
RUN npm ci --omit=dev

# 复制后端代码
COPY server/ .

# 从 Stage 1 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist /app/public

# 创建数据目录
RUN mkdir -p /data

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]