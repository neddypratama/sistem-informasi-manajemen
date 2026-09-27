<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import BaseLabel from '../components/ui/BaseLabel.vue';
import BaseSpinner from '../components/ui/BaseSpinner.vue';
import CardContent from '../components/ui/CardContent.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleSubmit() {
    error.value = '';
    loading.value = true;

    try {
        await auth.login({ username: username.value, password: password.value });
        router.replace('/');
    } catch (e) {
        error.value =
            e?.response?.data?.message || 'Login gagal. Periksa kembali kredensial Anda.';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div
        class="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 p-4"
    >
        <BaseCard class="w-full max-w-md">
            <CardHeader class="text-center">
                <div
                    class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white"
                >
                    📦
                </div>
                <CardTitle class="text-xl">Sistem Informasi Manajemen</CardTitle>
                <p class="text-sm text-slate-500">Bisnis &amp; Akuntansi</p>
            </CardHeader>
            <CardContent>
                <div v-if="error" class="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {{ error }}
                </div>
                <form class="space-y-4" @submit.prevent="handleSubmit">
                    <div>
                        <BaseLabel for="username">Username</BaseLabel>
                        <BaseInput id="username" v-model="username" required autofocus />
                    </div>
                    <div>
                        <BaseLabel for="password">Password</BaseLabel>
                        <BaseInput id="password" v-model="password" type="password" required />
                    </div>
                    <BaseButton type="submit" class="w-full" :disabled="loading">
                        <BaseSpinner v-if="loading" class="text-white" />
                        <template v-else>Masuk</template>
                    </BaseButton>
                </form>
            </CardContent>
        </BaseCard>
    </div>
</template>
