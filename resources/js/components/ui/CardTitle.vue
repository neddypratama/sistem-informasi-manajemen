<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('text-base font-semibold text-slate-900', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <h3 :class="classes" v-bind="rest">
        <slot />
    </h3>
</template>
