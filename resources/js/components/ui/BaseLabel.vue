<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('mb-1.5 block text-sm font-medium text-slate-700', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <label :class="classes" v-bind="rest">
        <slot />
    </label>
</template>
