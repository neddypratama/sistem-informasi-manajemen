<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const props = defineProps({
    variant: { type: String, default: 'default' },
});

const attrs = useAttrs();

const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
    info: 'bg-sky-100 text-sky-700',
    primary: 'bg-emerald-600 text-white',
};

const classes = computed(() =>
    cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[props.variant] ?? variants.default,
        attrs.class,
    ),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <span :class="classes" v-bind="rest">
        <slot />
    </span>
</template>
