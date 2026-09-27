<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('[&_tr:last-child]:border-0', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <tbody :class="classes" v-bind="rest">
        <slot />
    </tbody>
</template>
