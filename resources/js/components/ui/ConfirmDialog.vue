<script setup>
import BaseButton from './BaseButton.vue';
import BaseModal from './BaseModal.vue';

defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: 'Konfirmasi Hapus' },
    message: { type: String, default: '' },
    loading: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'confirm']);
</script>

<template>
    <BaseModal :open="open" :title="title" @close="emit('close')">
        <p class="text-sm text-slate-600">{{ message }}</p>

        <template #footer>
            <BaseButton variant="outline" @click="emit('close')">Batal</BaseButton>
            <BaseButton variant="danger" :disabled="loading" @click="emit('confirm')">
                {{ loading ? 'Memproses...' : 'Ya, Hapus' }}
            </BaseButton>
        </template>
    </BaseModal>
</template>
