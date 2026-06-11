<template>
  <div class="config-page">
    <div class="page-header">
      <h1>系统配置</h1>
      <p class="page-desc">设置用于管理 Cloudflare Tunnel 的凭据和系统设置</p>
    </div>

    <!-- Cloudflare 配置卡片 -->
    <el-card class="config-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <el-icon class="card-icon"><Cloudy /></el-icon>
            <span class="card-title">Cloudflare 配置</span>
          </div>
          <el-button text bg type="info" icon="QuestionFilled" @click="showCfHelp = true">
            使用说明
          </el-button>
        </div>
      </template>

      <el-form
        ref="cfFormRef"
        :model="cfForm"
        label-width="100px"
        class="cf-form"
        @submit.prevent="handleSaveCfConfig"
      >
        <el-form-item
          label="账号 ID"
          prop="accountId"
          :rules="[{ required: true, message: '请输入账号 ID' }]"
        >
          <el-input
            v-model="cfForm.accountId"
            placeholder="请输入账号 ID，例如：a1b2c3d4e5f6g7h8"
          />
        </el-form-item>

        <el-form-item
          label="API 令牌"
          prop="apiToken"
          :rules="[{ required: true, message: '请输入 API 令牌' }]"
        >
          <el-input
            v-model="cfForm.apiToken"
            show-password
            placeholder="请输入 API 令牌"
          />
        </el-form-item>

        <div class="form-actions">
          <el-button
            :loading="testing"
            icon="CircleCheck"
            @click="handleTestConfig"
          >
            测试配置
          </el-button>
          <el-button
            type="primary"
            icon="Check"
            :loading="savingCf"
            native-type="submit"
          >
            保存配置
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 系统设置卡片 -->
    <el-card class="config-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <el-icon class="card-icon"><Setting /></el-icon>
            <span class="card-title">系统设置</span>
          </div>
          <el-button text bg type="info" icon="QuestionFilled" @click="showSysHelp = true">
            使用说明
          </el-button>
        </div>
      </template>

      <el-form :model="sysForm" label-width="180px">
        <el-form-item label="系统重启后自动连接">
          <div class="switch-with-desc">
            <el-switch v-model="sysForm.autoConnectOnBoot" />
            <span class="switch-desc">系统启动时自动连接上次使用的 Tunnel</span>
          </div>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="连接协议">
              <el-select v-model="sysForm.protocol" class="full-width">
                <el-option
                  v-for="opt in PROTOCOL_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="边缘节点 IP">
              <el-select v-model="sysForm.edgeIpVersion" class="full-width">
                <el-option
                  v-for="opt in IP_VERSION_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                  :disabled="opt.value === '6' && !hasIPv6"
                />
              </el-select>
              <div v-if="!hasIPv6" class="ipv6-hint">未检测到公网 IPv6 地址</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button
            type="primary"
            icon="Check"
            :loading="savingSys"
            @click="handleSaveSysConfig"
          >
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Cloudflare 配置说明对话框 -->
    <el-dialog v-model="showCfHelp" title="Cloudflare 配置说明" width="520px">
      <div class="help-content">
        <div class="help-item">
          <el-icon class="help-icon success"><CircleCheck /></el-icon>
          <span>在上侧填写 Cloudflare 账号 ID 与 API 令牌。</span>
        </div>
        <div class="help-item">
          <el-icon class="help-icon primary"><Reading /></el-icon>
          <div>
            <p>Account ID 与 API Token 获取教程：</p>
            <el-button
              link
              type="primary"
              icon="Link"
              @click="openUrl('https://fnosp.dustinky.com/products/tunnel/setup/configuration')"
            >
              打开教程
            </el-button>
          </div>
        </div>
        <div class="help-item">
          <el-icon class="help-icon primary"><Checked /></el-icon>
          <div>
            <p>请创建包含以下权限的 API 令牌：</p>
            <ul>
              <li>账户: Cloudflare Tunnel [编辑]</li>
              <li>账户: Cloudflare Tunnel [读取]</li>
              <li>区域: DNS [编辑]</li>
              <li>区域: DNS [读取]</li>
            </ul>
          </div>
        </div>
        <div class="help-item">
          <el-icon class="help-icon primary"><CircleCheck /></el-icon>
          <span>点击"保存配置"后，将用于创建、查看与连接 Tunnel。</span>
        </div>
        <el-alert
          type="info"
          show-icon
          :closable="false"
          title="安全提示"
          description="请妥善保管 API 令牌，避免泄露。建议为本应用单独创建最小权限的令牌。"
        />
      </div>
    </el-dialog>

    <!-- 系统设置说明对话框 -->
    <el-dialog v-model="showSysHelp" title="系统设置说明" width="520px">
      <div class="help-content">
        <div class="help-item">
          <el-icon class="help-icon primary"><WindPower /></el-icon>
          <div>
            <p>系统重启后自动连接功能：</p>
            <ul>
              <li>开启后，系统启动时会自动连接上次使用的 Tunnel</li>
              <li>适用于需要长期稳定运行的场景</li>
            </ul>
          </div>
        </div>
        <div class="help-item">
          <el-icon class="help-icon primary"><Connection /></el-icon>
          <div>
            <p>连接协议用于指定 cloudflared 与 Cloudflare 边缘之间的传输协议：</p>
            <ul>
              <li>http2：兼容性更好，通常更稳定（默认）</li>
              <li>quic：基于 UDP，网络条件良好时可能更快</li>
            </ul>
          </div>
        </div>
        <div class="help-item">
          <el-icon class="help-icon primary"><ChatLineSquare /></el-icon>
          <div>
            <p>边缘节点 IP 用于选择连接 Cloudflare 边缘时优先使用的 IP 版本：</p>
            <ul>
              <li>IPv4：适合大多数网络环境（默认）</li>
              <li>IPv6：当你的网络具备稳定 IPv6 出口时可选择</li>
            </ul>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Cloudy,
  Setting,
  QuestionFilled,
  CircleCheck,
  Reading,
  Link as ExternalLink,
  Checked,
  Connection,
  WindPower,
  ChatLineSquare,
} from '@element-plus/icons-vue';
import {
  fetchCloudflareConfig,
  saveCloudflareConfig,
  testCloudflareConfig,
  updateSystemConfig,
} from '../api/config';
import { PROTOCOL_OPTIONS, IP_VERSION_OPTIONS } from '../types';

// #region 表单数据

/** Cloudflare 配置表单 */
const cfForm = ref({
  accountId: '',
  apiToken: '',
});

/** 系统配置表单 */
const sysForm = ref({
  protocol: 'http2' as 'http2' | 'quic',
  edgeIpVersion: '4' as '4' | '6',
  autoConnectOnBoot: true,
});

/** 测试中 */
const testing = ref(false);

/** 保存 CF 配置中 */
const savingCf = ref(false);

/** 保存系统配置中 */
const savingSys = ref(false);

/** CF 说明弹窗 */
const showCfHelp = ref(false);

/** 系统说明弹窗 */
const showSysHelp = ref(false);

/** 系统是否支持 IPv6 */
const hasIPv6 = ref(true);

// #endregion

// #region 方法

/**
 * 打开外部链接
 */
function openUrl(url: string): void {
  window.open(url, '_blank');
}

/**
 * 测试 Cloudflare 配置
 */
async function handleTestConfig(): Promise<void> {
  if (!cfForm.value.accountId || !cfForm.value.apiToken) {
    ElMessage.warning('请先填写账号 ID 与 API 令牌');
    return;
  }

  testing.value = true;
  try {
    const res = await testCloudflareConfig(cfForm.value);
    if (res.success) {
      ElMessage.success(res.message || '验证通过');
    } else {
      ElMessage.error(res.message || '验证失败');
    }
  } finally {
    testing.value = false;
  }
}

/**
 * 保存 Cloudflare 配置
 */
async function handleSaveCfConfig(): Promise<void> {
  savingCf.value = true;
  try {
    const res = await saveCloudflareConfig(cfForm.value);
    if (res.success) {
      ElMessage.success(res.message || '配置保存成功');
    }
  } finally {
    savingCf.value = false;
  }
}

/**
 * 保存系统配置
 */
async function handleSaveSysConfig(): Promise<void> {
  savingSys.value = true;
  try {
    const res = await updateSystemConfig(sysForm.value);
    if (res.success) {
      ElMessage.success(res.message || '系统设置保存成功');
    }
  } finally {
    savingSys.value = false;
  }
}

/**
 * 从服务端加载配置
 */
async function loadConfig(): Promise<void> {
  try {
    const res = await fetchCloudflareConfig();
    if (res.success && res.data) {
      const data = res.data as Record<string, unknown>;
      if (data.accountId || data.apiToken) {
        cfForm.value.accountId = (data.accountId as string) || '';
        cfForm.value.apiToken = (data.apiToken as string) || '';
      }
      sysForm.value.protocol = (data.protocol as 'http2' | 'quic') || 'http2';
      sysForm.value.edgeIpVersion = (data.edgeIpVersion as '4' | '6') || '4';
      sysForm.value.autoConnectOnBoot =
        data.autoConnectOnBoot !== undefined
          ? (data.autoConnectOnBoot as boolean)
          : true;
      hasIPv6.value = data.hasIPv6 !== false;

      // 没有 IPv6 时强制切回 IPv4
      if (!hasIPv6.value && sysForm.value.edgeIpVersion === '6') {
        sysForm.value.edgeIpVersion = '4';
      }
    }
  } catch {
    // 使用默认值
  }
}

// #endregion

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.config-page {
  max-width: 800px;
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

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-icon {
  font-size: 20px;
  color: var(--el-color-primary);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}


.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
}

.full-width {
  width: 100%;
}

.switch-with-desc {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-desc {
  font-size: 13px;
  color: #909399;
}

.help-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  line-height: 1.6;
}

.help-icon {
  margin-top: 3px;
  font-size: 16px;
  flex-shrink: 0;
}

.help-icon.success {
  color: var(--el-color-success);
}

.help-icon.primary {
  color: var(--el-color-primary);
}

ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

li {
  margin-bottom: 4px;
}

.ipv6-hint {
  font-size: 12px;
  color: var(--el-color-warning);
  margin-top: 4px;
}
</style>