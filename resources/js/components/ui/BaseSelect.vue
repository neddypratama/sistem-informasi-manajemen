<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const model = defineModel({ default: '' });

const attrs = useAttrs();

const classes = computed(() =>
    cn(
        'flex h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50',
        attrs.class,
    ),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <select v-model="model" :class="classes" v-bind="rest">
        <slot />
    </select>
</template>
