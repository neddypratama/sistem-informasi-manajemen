<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() =>
    cn('rounded-xl border border-slate-200 bg-white shadow-sm', attrs.class),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <div :class="classes" v-bind="rest">
        <slot />
    </div>
</template>
