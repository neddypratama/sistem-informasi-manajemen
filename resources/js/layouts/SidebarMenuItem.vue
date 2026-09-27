<script setup>
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { cn } from '../lib/utils';

const props = defineProps({
    to: { type: String, required: true },
    icon: { type: String, default: '' },
    label: { type: String, required: true },
    exact: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

const route = useRoute();

const isActive = computed(() =>
    props.exact ? route.path === props.to : route.path === props.to || route.path.startsWith(`${props.to}/`),
);

const classes = computed(() =>
    cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        props.collapsed && 'justify-center px-2',
        isActive.value
            ? 'bg-emerald-600 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ),
);
</script>

<template>
    <RouterLink :to="to" :title="label" :class="classes" @click="emit('select')">
        <span class="shrink-0">{{ icon }}</span>
        <span v-if="!collapsed">{{ label }}</span>
    </RouterLink>
</template>
