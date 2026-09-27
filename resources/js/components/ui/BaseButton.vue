<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    variant: { type: String, default: 'default' },
    size: { type: String, default: 'default' },
});

const attrs = useAttrs();

const variants = {
    default: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    link: 'text-emerald-600 underline-offset-4 hover:underline',
};

const sizes = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-10 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
    icon: 'h-9 w-9',
};

const classes = computed(() =>
    cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50',
        variants[props.variant],
        sizes[props.size],
        attrs.class,
    ),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <button :class="classes" v-bind="rest">
        <slot />
    </button>
</template>
