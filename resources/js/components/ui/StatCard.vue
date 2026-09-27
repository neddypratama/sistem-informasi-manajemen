<script setup>
import BaseCard from './BaseCard.vue';
import CardContent from './CardContent.vue';

defineProps({
    label: { type: String, required: true },
    value: { type: [String, Number], default: '' },
    hint: { type: String, default: '' },
    valueClass: { type: String, default: 'text-slate-900' },
    hintClass: { type: String, default: 'text-slate-400' },
});
</script>

<template>
    <BaseCard>
        <CardContent class="p-5">
            <div class="flex items-start justify-between gap-2">
                <p class="text-sm text-slate-500">{{ label }}</p>
                <span v-if="$slots.icon" class="text-slate-400"><slot name="icon" /></span>
            </div>
            <p class="mt-1 truncate text-2xl font-bold" :class="valueClass">{{ value }}</p>
            <p v-if="hint" class="mt-1 truncate text-xs" :class="hintClass">{{ hint }}</p>
        </CardContent>
    </BaseCard>
</template>
