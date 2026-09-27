<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('flex flex-col space-y-1.5 p-5 pb-3', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <div :class="classes" v-bind="rest">
        <slot />
    </div>
</template>
