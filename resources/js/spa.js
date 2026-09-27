import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';

const container = document.getElementById('app');

if (container) {
    createApp(App).use(createPinia()).use(router).mount(container);
}
