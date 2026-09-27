<script setup>
defineProps({
    message: { type: String, default: 'Belum ada data.' },
});
</script>

<template>
    <div class="py-12 text-center text-sm text-slate-500">{{ message }}</div>
</template>
