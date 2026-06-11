<template>
  <div class="log-page">
    <div class="page-header">
      <h1>运行日志</h1>
      <p class="page-desc">实时查看 cloudflared 日志输出</p>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="auto-refresh-btn">
          <span class="auto-refresh-label">自动刷新</span>
          <el-switch v-model="autoRefresh" />
        </div>
        <el-button
          icon="Refresh"
          :loading="refreshing"
          @click="handleRefresh"
        >
          刷新
        </el-button>
        <el-button
          type="danger"
          icon="Delete"
          @click="handleClearLogs"
        >
          清空
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchQuery"
          placeholder="筛选日志..."
          prefix-icon="Search"
          clearable
          class="search-input"
        />
      </div>
    </div>

    <!-- 终端日志 -->
    <div ref="terminalRef" class="terminal">
      <div v-if="filteredLogs.length === 0" class="terminal-empty">
        暂无日志
      </div>
      <div v-for="(line, index) in filteredLogs" :key="index" class="terminal-line">
        <span class="terminal-line-num">{{ index + 1 }}</span>
        <span class="terminal-line-ts">[{{ formatTimestamp(line) }}]</span>
        <span :class="['terminal-line-text', getLogClass(line)]">{{ line }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Delete, Search } from '@element-plus/icons-vue';
import { fetchLogs, clearLogs } from '../api/logs';

// #region 状态

/** 原始日志 */
const logs = ref<string[]>([]);

/** 刷新中 */
const refreshing = ref(false);

/** 自动刷新 */
const autoRefresh = ref(true);

/** 自动刷新定时器 */
let refreshTimer: ReturnType<typeof setInterval> | null = null;

/** 自动刷新间隔（毫秒） */
const REFRESH_INTERVAL = 3000;

/** 搜索关键词 */
const searchQuery = ref('');

/** 终端容器引用 */
const terminalRef = ref<HTMLElement | null>(null);

// #endregion

// #region 计算属性

/** 过滤后的日志 */
const filteredLogs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return logs.value;
  return logs.value.filter((line) => line.toLowerCase().includes(q));
});

// #endregion

// #region 方法

/**
 * 提取日志中的时间戳（取行首时间）
 */
function formatTimestamp(line: string): string {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (match) return match[1];
  const m2 = line.match(/^(\d{2}:\d{2}:\d{2})/);
  if (m2) return m2[1];
  return '';
}

/**
 * 根据日志内容返回高亮样式
 */
function getLogClass(line: string): string {
  const upper = line.toUpperCase();
  if (upper.includes('ERR') || upper.includes('ERROR')) return 'log-err';
  if (upper.includes('WARN') || upper.includes('WARNING')) return 'log-warn';
  return '';
}

/**
 * 滚动到底部
 */
function scrollToBottom(): void {
  nextTick(() => {
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
    }
  });
}

/**
 * 加载日志
 */
async function loadLogs(): Promise<void> {
  const res = await fetchLogs();
  if (res.success && res.data) {
    logs.value = res.data;
    scrollToBottom();
  }
}

/**
 * 手动刷新
 */
async function handleRefresh(): Promise<void> {
  refreshing.value = true;
  try {
    await loadLogs();
    ElMessage.success('日志已刷新');
  } finally {
    refreshing.value = false;
  }
}

/**
 * 清空日志
 */
async function handleClearLogs(): Promise<void> {
  const res = await clearLogs();
  if (res.success) {
    logs.value = [];
    ElMessage.success('日志已清空');
  }
}

/**
 * 启动自动刷新
 */
function startAutoRefresh(): void {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    loadLogs();
  }, REFRESH_INTERVAL);
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// #endregion

// 监听自动刷新开关
watch(autoRefresh, (val) => {
  if (val) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

onMounted(() => {
  loadLogs();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.log-page {
  max-width: 1000px;
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
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-size: 13px;
}

.auto-refresh-label {
  color: #909399;
}

.search-input {
  width: 280px;
}

/* ====== 终端样式 ====== */

.terminal {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px 0;
  height: 60vh;
  overflow-y: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
}

.terminal::-webkit-scrollbar {
  width: 8px;
}

.terminal::-webkit-scrollbar-track {
  background: #2a2a2a;
}

.terminal::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.terminal-empty {
  color: #666;
  text-align: center;
  padding: 48px 16px;
  font-size: 14px;
}

.terminal-line {
  display: flex;
  align-items: flex-start;
  padding: 0 16px;
  color: #d4d4d4;
  white-space: pre;
}

.terminal-line:hover {
  background: rgba(255, 255, 255, 0.04);
}

.terminal-line-num {
  color: #555;
  min-width: 48px;
  text-align: right;
  padding-right: 12px;
  user-select: none;
  flex-shrink: 0;
}

.terminal-line-ts {
  color: #6a9955;
  padding-right: 12px;
  flex-shrink: 0;
}

.terminal-line-text {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
}

.terminal-line-text.log-err {
  color: #f48771;
}

.terminal-line-text.log-warn {
  color: #dcdcaa;
}
</style>