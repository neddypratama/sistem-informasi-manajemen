<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('px-3 py-3 align-middle', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <td :class="classes" v-bind="rest">
        <slot />
    </td>
</template>
