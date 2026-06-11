<template>
  <div class="tunnel-page">
    <div class="page-header">
      <h1>Tunnel 列表</h1>
      <p class="page-desc">管理、创建、连接 Cloudflare Tunnels</p>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <h2>Tunnels</h2>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadTunnels">
          {{ loading ? '加载中...' : '刷新列表' }}
        </el-button>
        <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
          新建 Tunnel
        </el-button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && tunnels.length === 0" class="empty-state">
      <div class="empty-icon-wrapper">
        <el-icon class="empty-icon"><Connection /></el-icon>
        <div class="empty-icon-badge">
          <el-icon><Plus /></el-icon>
        </div>
      </div>
      <h3>暂无 Tunnel</h3>
      <p>您还没有创建任何 Tunnel。创建一个 Tunnel 来开始安全地连接您的服务到互联网。</p>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog = true">
        立即创建
      </el-button>
    </div>

    <!-- Tunnel 列表 -->
    <div v-else class="tunnel-list">
      <el-card
        v-for="tunnel in tunnels"
        :key="tunnel.id"
        shadow="hover"
        class="tunnel-card"
      >
        <div class="tunnel-card-body">
          <div class="tunnel-info">
            <div class="tunnel-icon">
              <el-icon class="tunnel-icon-inner"><Connection /></el-icon>
            </div>
            <div class="tunnel-meta">
              <div class="tunnel-name-row">
                <span class="tunnel-name">{{ tunnel.name }}</span>
                <el-tag
                  :type="getStatusColor(tunnel.status)"
                  size="small"
                  effect="plain"
                >
                  {{ getStatusText(tunnel.status) }}
                </el-tag>
              </div>
              <div class="tunnel-details">
                <span v-if="tunnel.created_at" class="tunnel-detail-item">
                  <el-icon><Calendar /></el-icon>
                  {{ formatDate(tunnel.created_at) }}
                </span>
                <span v-if="tunnel.connections" class="tunnel-detail-item">
                  <el-icon><Connection /></el-icon>
                  {{ tunnel.connections.length }} 连接
                </span>
              </div>
            </div>
          </div>

          <div class="tunnel-actions">
            <!-- 连接/断开按钮 -->
            <el-button
              v-if="currentTunnelId !== tunnel.id"
              type="success"
              size="small"
              plain
              :icon="VideoPlay"
              :loading="connectingId === tunnel.id"
              :disabled="!!connectingId"
              @click="handleConnect(tunnel.id)"
            >
              连接
            </el-button>
            <el-button
              v-else
              type="danger"
              size="small"
              plain
              :icon="VideoPause"
              :loading="connectingId === tunnel.id"
              :disabled="!!connectingId"
              @click="handleDisconnect(tunnel.id)"
            >
              断开
            </el-button>

            <!-- 配置链接 -->
            <el-button
              size="small"
              :icon="Setting"
              @click="handleConfigIngress(tunnel)"
            >
              配置
            </el-button>

            <!-- 删除 -->
            <el-popconfirm
              title="确定要删除这个 Tunnel 吗？此操作无法撤销。"
              confirm-button-text="确认删除"
              @confirm="handleDelete(tunnel.id)"
            >
              <template #reference>
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  :disabled="currentTunnelId === tunnel.id"
                >
                  删除
                </el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 新建 Tunnel 对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建 Tunnel" width="420px">
      <el-form @submit.prevent="handleCreate">
        <el-form-item
          label="名称"
          :rules="[{ required: true, message: '请输入 Tunnel 名称' }]"
        >
          <el-input
            v-model="newTunnelName"
            placeholder="例如：my-tunnel"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 配置链接对话框 -->
    <el-dialog
      v-model="showConfigDialog"
      width="760px"
      :close-on-click-modal="false"
      class="config-dialog"
    >
      <template #header>
        <div class="config-dialog-header">
          <h3 class="config-dialog-title">配置链接</h3>
          <p class="config-dialog-desc">
            为 <strong>{{ configTunnelName }}</strong> 设置域名转发规则
          </p>
        </div>
      </template>

      <div class="ingress-list">
        <div class="ingress-list-inner">
          <TransitionGroup name="rule">
            <div
              v-for="(rule, index) in ingressRules"
              :key="rule._key ?? index"
              class="ingress-row"
            >
              <div class="ingress-row-body">
                <div class="ingress-field">
                  <label class="ingress-label">域名</label>
                  <el-input
                    v-model="rule.hostname"
                    placeholder="example.com"
                    size="large"
                  />
                </div>
                <div class="ingress-field">
                  <label class="ingress-label">本地服务</label>
                  <el-input
                    v-model="rule.service"
                    placeholder="http://localhost:8080"
                    size="large"
                  />
                </div>
              </div>
              <button
                class="ingress-remove-btn"
                :disabled="ingressRules.length <= 1"
                @click="removeIngressRule(index)"
              >
                <el-icon><Delete /></el-icon>
              </button>
            </div>
          </TransitionGroup>
        </div>

        <button class="ingress-add-btn" @click="addIngressRule">
          <el-icon><Plus /></el-icon>
          <span>添加规则</span>
        </button>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button size="large" @click="showConfigDialog = false">取消</el-button>
          <el-button size="large" type="primary" :loading="savingConfig" @click="handleSaveConfig">
            保存配置
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Connection,
  Plus,
  Refresh,
  Calendar,
  VideoPlay,
  VideoPause,
  Setting,
  Delete,
} from '@element-plus/icons-vue';
import {
  fetchTunnels,
  createTunnel,
  removeTunnel,
  fetchTunnelConfig,
  updateTunnelConfig,
  startTunnel,
  stopTunnel,
  fetchCurrentTunnel,
} from '../api/tunnel';
import { post } from '../api/request';
import type { ITunnel, IIngressRule } from '../types';

// #region 状态

/** Tunnel 列表 */
const tunnels = ref<ITunnel[]>([]);

/** 加载中 */
const loading = ref(false);

/** 当前连接的 Tunnel ID */
const currentTunnelId = ref<string | null>(null);

/** 正在连接的 Tunnel ID */
const connectingId = ref<string | null>(null);

/** 创建对话框 */
const showCreateDialog = ref(false);

/** 新建名称 */
const newTunnelName = ref('');

/** 创建中 */
const creating = ref(false);

/** 配置对话框 */
const showConfigDialog = ref(false);

/** 当前配置的 Tunnel */
const configTunnelId = ref<string | null>(null);

/** 当前配置的 Tunnel 名称 */
const configTunnelName = ref('');

/** Ingress 规则列表 */
const ingressRules = ref<IIngressRule[]>([]);

/** 保存配置中 */
const savingConfig = ref(false);

// #endregion

// #region 方法

/**
 * 获取状态颜色
 */
function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    healthy: 'success',
    degraded: 'warning',
    inactive: 'info',
    down: 'danger',
  };
  return map[status] || 'info';
}

/**
 * 获取状态文本
 */
function getStatusText(status: string): string {
  const map: Record<string, string> = {
    healthy: '健康',
    degraded: '警告',
    inactive: '中性',
    down: '错误',
  };
  return map[status] || status;
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

/**
 * 加载 Tunnel 列表
 */
async function loadTunnels(): Promise<void> {
  loading.value = true;
  try {
    const res = await fetchTunnels();
    if (res.success && res.data) {
      tunnels.value = res.data;
    }

    // 获取当前运行的 Tunnel
    const statusRes = await fetchCurrentTunnel();
    if (statusRes.success && statusRes.data) {
      currentTunnelId.value = statusRes.data.tunnelId;
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 创建 Tunnel
 */
async function handleCreate(): Promise<void> {
  if (!newTunnelName.value.trim()) {
    ElMessage.warning('请输入 Tunnel 名称');
    return;
  }

  creating.value = true;
  try {
    const res = await createTunnel(newTunnelName.value.trim());
    if (res.success) {
      ElMessage.success('Tunnel 创建成功');
      showCreateDialog.value = false;
      newTunnelName.value = '';
      await loadTunnels();
    }
  } finally {
    creating.value = false;
  }
}

/**
 * 删除 Tunnel
 */
async function handleDelete(id: string): Promise<void> {
  const res = await removeTunnel(id);
  if (res.success) {
    ElMessage.success('Tunnel 删除成功');
    await loadTunnels();
  }
}

/**
 * 连接 Tunnel
 */
async function handleConnect(id: string): Promise<void> {
  connectingId.value = id;
  try {
    const res = await startTunnel(id);
    if (res.success) {
      ElMessage.success('Tunnel 已连接');
      currentTunnelId.value = id;
    }
  } finally {
    connectingId.value = null;
  }
}

/**
 * 断开 Tunnel
 */
async function handleDisconnect(id: string): Promise<void> {
  connectingId.value = id;
  try {
    const res = await stopTunnel(id);
    if (res.success) {
      ElMessage.success('Tunnel 已断开');
      currentTunnelId.value = null;
    }
  } finally {
    connectingId.value = null;
  }
}

/**
 * 打开配置对话框
 */
async function handleConfigIngress(tunnel: ITunnel): Promise<void> {
  configTunnelId.value = tunnel.id;
  configTunnelName.value = tunnel.name;
  ingressRules.value = [];

  // 加载已有配置
  const res = await fetchTunnelConfig(tunnel.id);
  if (res.success && res.data?.ingress) {
    // 过滤掉 404 fallback 规则
    ingressRules.value = res.data.ingress.filter(
      (r) => !r.service.includes('http_status:404')
    );
  }

  // 至少显示一行
  if (ingressRules.value.length === 0) {
    ingressRules.value.push({ hostname: '', service: '', _key: Date.now() });
  }

  showConfigDialog.value = true;
}

/**
 * 添加 ingress 规则
 */
function addIngressRule(): void {
  ingressRules.value.push({ hostname: '', service: '', _key: Date.now() + Math.random() });
}

/**
 * 移除 ingress 规则
 */
function removeIngressRule(index: number): void {
  if (ingressRules.value.length <= 1) {
    ElMessage.warning('至少需要保留一条规则');
    return;
  }
  ingressRules.value.splice(index, 1);
}

/**
 * 保存配置
 */
async function handleSaveConfig(): Promise<void> {
  if (!configTunnelId.value) return;

  // 过滤空行
  const validRules = ingressRules.value.filter(
    (r) => r.hostname.trim() && r.service.trim()
  );

  if (validRules.length === 0) {
    ElMessage.warning('请至少添加一条有效的链接规则');
    return;
  }

  savingConfig.value = true;
  try {
    // 保存 ingress 配置
    const res = await updateTunnelConfig(configTunnelId.value, validRules);
    if (res.success) {
      ElMessage.success('链接配置已保存');

      // 自动为每个域名创建 DNS 记录
      for (const rule of validRules) {
        await handleCreateDnsRecord(rule.hostname, configTunnelId.value);
      }

      showConfigDialog.value = false;
    }
  } finally {
    savingConfig.value = false;
  }
}

/**
 * 为单个域名创建 DNS 记录（冲突时弹确认框）
 */
async function handleCreateDnsRecord(
  hostname: string,
  tunnelId: string
): Promise<void> {
  const res = await post('/dns/record', { hostname, tunnelId });

  // 如果存在冲突，弹确认框让用户选择
  if (!res.success && (res as any).conflict) {
    try {
      await ElMessageBox.confirm(
        `域名 ${hostname} 已存在 DNS 记录，是否删除已有记录并重建？`,
        'DNS 记录冲突',
        {
          confirmButtonText: '是，删除并重建',
          cancelButtonText: '否，跳过',
          type: 'warning',
        }
      );
      // 用户确认，加 force=true 重试
      const forceRes = await post(
        `/dns/record?force=true`,
        { hostname, tunnelId }
      );
      if (forceRes.success) {
        ElMessage.success(`${hostname} DNS 记录已重建`);
      }
    } catch {
      // 用户取消，跳过
    }
  }
}

// #endregion 状态和方法

onMounted(() => {
  loadTunnels();
});
</script>

<style scoped>
.tunnel-page {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px;
}

.page-desc {
  color: #909399;
  margin: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
  text-align: center;
}

.empty-icon-wrapper {
  position: relative;
  background: rgba(64, 158, 255, 0.05);
  border-radius: 50%;
  padding: 24px;
  margin-bottom: 16px;
  border: 1px solid rgba(64, 158, 255, 0.1);
}

.empty-icon {
  font-size: 48px;
  color: var(--el-color-primary);
  opacity: 0.6;
}

.empty-icon-badge {
  position: absolute;
  bottom: 0;
  right: 4px;
  background: var(--el-bg-color);
  border-radius: 50%;
  padding: 4px;
  border: 1px solid var(--el-border-color);
}

.empty-state h3 {
  font-size: 18px;
  margin: 0 0 8px;
}

.empty-state p {
  color: #909399;
  max-width: 400px;
  margin: 0 0 24px;
}

.tunnel-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tunnel-card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.tunnel-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.tunnel-icon {
  padding: 10px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
}

.tunnel-icon-inner {
  font-size: 32px;
  color: var(--el-color-primary);
}

.tunnel-meta {
  min-width: 0;
  flex: 1;
}

.tunnel-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.tunnel-name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tunnel-details {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
}

.tunnel-detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tunnel-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.ingress-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ingress-list-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding: 2px 0;
}

.ingress-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  padding: 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ingress-row:focus-within {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.ingress-row-body {
  display: flex;
  flex: 1;
  gap: 12px;
  min-width: 0;
}

.ingress-field {
  flex: 1;
  min-width: 0;
}

.ingress-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  padding-left: 2px;
}

.ingress-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  font-size: 16px;
  margin-top: 20px;
}

.ingress-remove-btn:hover:not(:disabled) {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.ingress-remove-btn:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.ingress-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  margin-top: 4px;
}

.ingress-add-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

/* TransitionGroup 动画 */
.rule-enter-active {
  transition: all 0.25s ease;
}
.rule-leave-active {
  transition: all 0.2s ease;
}
.rule-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.rule-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.rule-move {
  transition: transform 0.25s ease;
}

/* 对话框 header */
.config-dialog :deep(.el-dialog__header) {
  padding-bottom: 0;
}

.config-dialog-header {
  padding: 4px 0 0;
}

.config-dialog-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px;
}

.config-dialog-desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.config-dialog :deep(.el-dialog__body) {
  padding-top: 20px;
  padding-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}
</style>