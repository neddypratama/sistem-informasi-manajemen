<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

defineProps({
    message: { type: String, default: '' },
});

const attrs = useAttrs();

const classes = computed(() =>
    cn('whitespace-pre-line rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700', attrs.class),
);

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <div v-if="message" :class="classes" v-bind="rest">
        {{ message }}
    </div>
</template>
