<script setup>
import { computed } from 'vue';
import ChevronsLeftIcon from '../components/icons/ChevronsLeftIcon.vue';
import ChevronsRightIcon from '../components/icons/ChevronsRightIcon.vue';
import { cn } from '../lib/utils';

const props = defineProps({
    collapsed: { type: Boolean, default: false },
    mobile: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle']);

/**
 * Saat diciutkan, tombol ini menjadi satu-satunya isi header: lebar sidebar
 * (64px, tersisa ~39px setelah padding) tidak cukup memuat lencana logo dan
 * tombol sekaligus, sehingga tombol akan terdorong keluar dan terpotong.
 * Karena itu tombolnya sekalian memakai gaya lencana logo.
 */
const toggleClasses = computed(() =>
    cn(
        'flex shrink-0 items-center justify-center rounded-lg transition-colors',
        props.collapsed
            ? 'mx-auto h-9 w-9 bg-emerald-600 text-white hover:bg-emerald-700'
            : 'h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-600',
    ),
);

const label = computed(() => {
    if (props.mobile) return 'Tutup menu';

    return props.collapsed ? 'Perluas menu' : 'Ciutkan menu';
});
</script>

<template>
    <div class="flex h-16 shrink-0 items-center gap-2 px-3">
        <div v-if="!collapsed" class="min-w-0 flex-1">
            <div class="truncate text-lg font-bold text-slate-900">SIM Stok</div>
            <div class="truncate text-xs text-slate-400">Bisnis &amp; Akuntansi</div>
        </div>

        <button
            type="button"
            :aria-label="label"
            :title="label"
            :class="toggleClasses"
            @click="emit('toggle')"
        >
            <span v-if="mobile" class="text-base leading-none">&#10005;</span>
            <ChevronsRightIcon v-else-if="collapsed" />
            <ChevronsLeftIcon v-else />
        </button>
    </div>
</template>
