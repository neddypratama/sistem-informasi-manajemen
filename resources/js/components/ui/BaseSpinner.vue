<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('h-5 w-5 animate-spin text-emerald-600', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <svg :class="classes" viewBox="0 0 24 24" fill="none" v-bind="rest">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
</template>
