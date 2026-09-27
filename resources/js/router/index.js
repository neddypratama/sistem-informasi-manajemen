import { createRouter, createWebHistory } from 'vue-router';
import { pasangGuard, routes } from './routes';

export const router = pasangGuard(
    createRouter({
        history: createWebHistory(),
        routes,
    }),
);
