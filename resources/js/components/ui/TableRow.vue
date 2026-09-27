<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() =>
    cn('border-b border-slate-100 transition-colors hover:bg-slate-50', attrs.class),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <tr :class="classes" v-bind="rest">
        <slot />
    </tr>
</template>
