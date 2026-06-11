import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';

/**
 * 应用入口
 * 挂载 Vue 3 + Element Plus + Vue Router + 图标全局注册
 */
const app = createApp(App);

app.use(ElementPlus);
app.use(router);

// 全局注册 Element Plus 图标组件，支持 icon="VideoPlay" 字符串写法
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount('#app');