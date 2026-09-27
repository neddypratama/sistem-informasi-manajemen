<script setup>
import { computed } from 'vue';
import BaseButton from './BaseButton.vue';
import { cn } from '../../lib/utils';

const props = defineProps({
    paginator: { type: Object, default: null },
});

const emit = defineEmits(['change']);

const visible = computed(
    () => Boolean(props.paginator?.last_page) && props.paginator.last_page > 1,
);

const current = computed(() => props.paginator?.current_page ?? 1);
const last = computed(() => props.paginator?.last_page ?? 1);

/** Nomor halaman dengan elipsis untuk rentang yang jauh dari halaman aktif. */
const pages = computed(() => {
    const result = [];

    for (let i = 1; i <= last.value; i++) {
        if (i === 1 || i === last.value || Math.abs(i - current.value) <= 2) {
            result.push(i);
        } else if (result[result.length - 1] !== '...') {
            result.push('...');
        }
    }

    return result;
});

function pageClass(page) {
    return cn(
        'h-8 w-8 rounded-lg text-sm',
        page === current.value ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100',
    );
}
</script>

<template>
    <div v-if="visible" class="flex flex-wrap items-center justify-between gap-3 py-4">
        <p class="text-sm text-slate-500">
            Menampilkan <span class="font-medium">{{ paginator.from ?? 0 }}</span>&ndash;<span
                class="font-medium"
            >{{ paginator.to ?? 0 }}</span> dari
            <span class="font-medium">{{ paginator.total }}</span>
        </p>
        <div class="flex items-center gap-1">
            <BaseButton
                variant="outline"
                size="sm"
                :disabled="current <= 1"
                @click="emit('change', current - 1)"
            >
                Sebelumnya
            </BaseButton>
            <template v-for="(page, index) in pages" :key="`${page}-${index}`">
                <span v-if="page === '...'" class="px-1 text-slate-400">&hellip;</span>
                <button v-else :class="pageClass(page)" @click="emit('change', page)">
                    {{ page }}
                </button>
            </template>
            <BaseButton
                variant="outline"
                size="sm"
                :disabled="current >= last"
                @click="emit('change', current + 1)"
            >
                Berikutnya
            </BaseButton>
        </div>
    </div>
</template>
