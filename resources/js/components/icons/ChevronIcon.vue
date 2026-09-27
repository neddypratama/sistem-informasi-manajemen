<script setup>
import { computed } from 'vue';
import { cn } from '../../lib/utils';

const props = defineProps({
    open: { type: Boolean, default: false },
});

const classes = computed(() =>
    cn('h-4 w-4 shrink-0 transition-transform duration-200', props.open && 'rotate-180'),
);
</script>

<template>
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        :class="classes"
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
</template>
