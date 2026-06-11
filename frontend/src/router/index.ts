import { createRouter, createWebHistory } from 'vue-router';
import ConfigView from '../views/ConfigView.vue';
import TunnelView from '../views/TunnelView.vue';
import LogView from '../views/LogView.vue';

/**
 * Vue Router 配置
 * 三个主页面：配置、Tunnel 列表、日志
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/config',
    },
    {
      path: '/config',
      name: 'config',
      component: ConfigView,
      meta: { title: '系统配置' },
    },
    {
      path: '/tunnels',
      name: 'tunnels',
      component: TunnelView,
      meta: { title: 'Tunnel 列表' },
    },
    {
      path: '/logs',
      name: 'logs',
      component: LogView,
      meta: { title: '运行日志' },
    },
  ],
});

export default router;