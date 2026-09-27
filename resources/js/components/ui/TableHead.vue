<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() =>
    cn(
        'h-11 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500',
        attrs.class,
    ),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <th :class="classes" v-bind="rest">
        <slot />
    </th>
</template>
