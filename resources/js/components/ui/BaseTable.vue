<script setup>
import { computed, useAttrs } from 'vue';
import { attrsWithoutClass, cn } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const classes = computed(() => cn('w-full caption-bottom text-sm', attrs.class));

const rest = computed(() => attrsWithoutClass(attrs));
</script>

<template>
    <div class="w-full overflow-x-auto">
        <table :class="classes" v-bind="rest">
            <slot />
        </table>
    </div>
</template>
