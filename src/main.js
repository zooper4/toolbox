// Vue 3 入口：加载全局样式并挂载应用根组件。
import { createApp } from 'vue';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist/700.css';
import '@fontsource/geist/800.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import './styles.css';
import App from './vue/App.vue';

createApp(App).mount('#app');
