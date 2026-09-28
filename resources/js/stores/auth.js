import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi } from '../api';
import { ensureCsrfCookie } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const isLoading = ref(true);
    const isReady = ref(false);

    let bootstrapPromise = null;

    /**
     * Ambil sesi aktif sekali saja; pemanggilan berikutnya memakai promise yang sama.
     */
    function bootstrap() {
        if (bootstrapPromise) {
            return bootstrapPromise;
        }

        bootstrapPromise = (async () => {
            try {
                await ensureCsrfCookie();
                const res = await authApi.me();
                user.value = res.user;
            } catch {
                user.value = null;
            } finally {
                isLoading.value = false;
                isReady.value = true;
            }
        })();

        return bootstrapPromise;
    }

    async function login(credentials) {
        await ensureCsrfCookie();
        const res = await authApi.login(credentials);
        user.value = res.user;
        isReady.value = true;
        isLoading.value = false;

        return res.user;
    }

    async function logout() {
        try {
            await authApi.logout();
        } finally {
            user.value = null;
            bootstrapPromise = null;
        }
    }

    const permissions = computed(() => user.value?.permissions ?? []);

    function hasPermission(permission) {
        return permissions.value.includes(permission);
    }

    return {
        user,
        isLoading,
        isReady,
        permissions,
        bootstrap,
        login,
        logout,
        hasPermission,
    };
});
