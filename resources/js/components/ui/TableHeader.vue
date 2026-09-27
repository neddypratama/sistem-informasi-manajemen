<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('[&_tr]:border-b', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <thead :class="classes" v-bind="rest">
        <slot />
    </thead>
</template>
