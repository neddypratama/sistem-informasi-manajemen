<script setup>
import { RouterView } from 'vue-router';
import PageLoader from './components/ui/PageLoader.vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
</script>

<template>
    <div v-if="auth.isLoading" class="flex min-h-screen items-center justify-center">
        <PageLoader />
    </div>
    <RouterView v-else />
</template>
