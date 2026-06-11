<template>
  <el-container class="app-container">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <el-icon class="header-logo"><Connection /></el-icon>
          <span class="header-title">Cloudflare Tunnel Manager</span>
        </div>
        <el-menu
          :default-active="currentRoute"
          mode="horizontal"
          router
          class="header-menu"
        >
          <el-menu-item index="/config">
            <el-icon><Setting /></el-icon>
            <span>系统配置</span>
          </el-menu-item>
          <el-menu-item index="/tunnels">
            <el-icon><List /></el-icon>
            <span>Tunnel 列表</span>
          </el-menu-item>
          <el-menu-item index="/logs">
            <el-icon><Document /></el-icon>
            <span>运行日志</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  Connection,
  List,
  Setting,
  Document,
} from '@element-plus/icons-vue';

const route = useRoute();

/** 当前路由路径 */
const currentRoute = computed(() => route.path);
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background: var(--el-bg-color-page);
}

.app-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  align-items: center;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 40px;
  flex-shrink: 0;
}

.header-logo {
  font-size: 24px;
  color: var(--el-color-primary);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.header-menu {
  flex: 1;
  border-bottom: none !important;
}

.app-main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px;
  width: 100%;
}
</style>