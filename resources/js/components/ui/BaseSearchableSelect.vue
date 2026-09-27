<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { cn } from '../../lib/utils';

const props = defineProps({
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },
    placeholder: { type: String, default: '-- Pilih --' },
    searchPlaceholder: { type: String, default: 'Cari...' },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: false },
    valueKey: { type: String, default: 'value' },
    labelKey: { type: String, default: 'label' },
    id: { type: String, default: '' },
    class: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const searchQuery = ref('');
const rootRef = ref(null);
const buttonRef = ref(null);
const panelRef = ref(null);
const searchInputRef = ref(null);
const listRef = ref(null);
const highlightedIndex = ref(0);
const panelStyle = ref({ top: 0, left: 0, width: 0, maxHeight: 288 });

const normalizedOptions = computed(() => {
    return props.options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
            const val = opt[props.valueKey] !== undefined ? opt[props.valueKey] : opt.id;
            const lbl = opt[props.labelKey] !== undefined ? opt[props.labelKey] : opt.nama || opt.name || opt.nama_barang || opt.title || String(val);
            const desc = opt.description || opt.sublabel || opt.kode || opt.keterangan || '';

            return { value: String(val), label: String(lbl), description: desc ? String(desc) : '', raw: opt };
        }

        return { value: String(opt), label: String(opt), description: '', raw: opt };
    });
});

const selectedOption = computed(() => {
    const target = String(props.modelValue);

    return normalizedOptions.value.find((opt) => opt.value === target) || null;
});

const filteredOptions = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return normalizedOptions.value;

    return normalizedOptions.value.filter((opt) => {
        return (
            opt.label.toLowerCase().includes(q) ||
            opt.description.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q)
        );
    });
});

watch(isOpen, async (val) => {
    if (val) {
        searchQuery.value = '';
        highlightedIndex.value = 0;
        openPanel();
        await nextTick();
        if (searchInputRef.value) {
            searchInputRef.value.focus();
        }
        window.addEventListener('scroll', closeOnScroll, true);
        window.addEventListener('resize', closeOnResize);
    } else {
        window.removeEventListener('scroll', closeOnScroll, true);
        window.removeEventListener('resize', closeOnResize);
    }
});

function openPanel() {
    const el = buttonRef.value;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    const maxHeight = 288;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const height = Math.min(maxHeight, Math.max(spaceBelow, spaceAbove) - gap);

    let top;
    if (spaceBelow >= height + gap) {
        top = rect.bottom + gap;
    } else {
        top = Math.max(gap, rect.top - height - gap);
    }

    const left = Math.max(gap, Math.min(rect.left, window.innerWidth - rect.width - gap));

    panelStyle.value = { top, left, width: rect.width, maxHeight: height };
}

function closeOnScroll(event) {
    if (panelRef.value && event?.target && panelRef.value.contains(event.target)) {
        return;
    }
    isOpen.value = false;
}

function closeOnResize() {
    isOpen.value = false;
}

watch(searchQuery, () => {
    highlightedIndex.value = 0;
});

function toggleOpen() {
    if (props.disabled) return;
    isOpen.value = !isOpen.value;
}

function selectOption(option) {
    const val = option ? option.value : '';
    emit('update:modelValue', val);
    emit('change', val);
    isOpen.value = false;
}

function clearSelection(e) {
    e.stopPropagation();
    emit('update:modelValue', '');
    emit('change', '');
}

function handleKeydown(e) {
    if (props.disabled) return;

    if (!isOpen.value) {
        if (['Enter', 'ArrowDown', 'Space'].includes(e.code)) {
            e.preventDefault();
            isOpen.value = true;
        }
        return;
    }

    if (e.key === 'Escape') {
        isOpen.value = false;
        return;
    }

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredOptions.value.length > 0) {
            highlightedIndex.value = (highlightedIndex.value + 1) % filteredOptions.value.length;
            scrollHighlightedIntoView();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredOptions.value.length > 0) {
            highlightedIndex.value =
                (highlightedIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length;
            scrollHighlightedIntoView();
        }
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = filteredOptions.value[highlightedIndex.value];
        if (target) {
            selectOption(target);
        }
    }
}

function scrollHighlightedIntoView() {
    nextTick(() => {
        if (!listRef.value) return;
        const el = listRef.value.children[highlightedIndex.value];
        if (el) {
            el.scrollIntoView({ block: 'nearest' });
        }
    });
}

function handleClickOutside(event) {
    const target = event.target;
    if (
        rootRef.value &&
        panelRef.value &&
        !rootRef.value.contains(target) &&
        !panelRef.value.contains(target)
    ) {
        isOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <div ref="rootRef" class="relative w-full" @keydown="handleKeydown">
        <!-- Trigger button -->
        <button
            ref="buttonRef"
            :id="id"
            type="button"
            :disabled="disabled"
            :class="
                cn(
                    'flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
                    isOpen && 'border-emerald-500 ring-2 ring-emerald-500/30',
                    props.class
                )
            "
            @click="toggleOpen"
        >
            <span v-if="selectedOption" class="truncate font-medium text-slate-900">
                {{ selectedOption.label }}
                <span v-if="selectedOption.description" class="ml-1.5 text-xs text-slate-400">
                    ({{ selectedOption.description }})
                </span>
            </span>
            <span v-else class="truncate text-slate-400">
                {{ placeholder }}
            </span>

            <div class="ml-2 flex items-center gap-1">
                <span
                    v-if="clearable && selectedOption && !disabled"
                    class="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Hapus pilihan"
                    @click="clearSelection"
                >
                    &#10005;
                </span>
                <svg
                    class="h-4 w-4 text-slate-400 transition-transform duration-200"
                    :class="{ 'rotate-180': isOpen }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </button>

        <!-- Dropdown panel (ditampilkan di body agar tidak terpotong overflow) -->
        <Teleport to="body">
            <div
                v-if="isOpen"
                ref="panelRef"
                class="fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5"
                :style="{
                    top: `${panelStyle.top}px`,
                    left: `${panelStyle.left}px`,
                    width: `${panelStyle.width}px`,
                    maxHeight: `${panelStyle.maxHeight}px`,
                }"
            >
                <!-- Search input -->
                <div class="shrink-0 border-b border-slate-100 p-2">
                    <div class="relative">
                        <svg
                            class="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <input
                            ref="searchInputRef"
                            v-model="searchQuery"
                            type="text"
                            :placeholder="searchPlaceholder"
                            class="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                <!-- Options List -->
                <ul ref="listRef" class="min-h-0 flex-1 overflow-y-auto py-1 text-sm">
                    <li
                        v-if="filteredOptions.length === 0"
                        class="px-3 py-2.5 text-center text-xs text-slate-400"
                    >
                        Tidak ada hasil ditemukan.
                    </li>
                    <li
                        v-for="(option, index) in filteredOptions"
                        :key="option.value"
                        :class="
                            cn(
                                'cursor-pointer px-3 py-2 text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900',
                                option.value === String(modelValue) && 'bg-emerald-100 font-semibold text-emerald-900',
                                index === highlightedIndex && option.value !== String(modelValue) && 'bg-slate-100'
                            )
                        "
                        @click="selectOption(option)"
                        @mouseenter="highlightedIndex = index"
                    >
                        <div class="flex items-center justify-between">
                            <span class="truncate">{{ option.label }}</span>
                            <span v-if="option.description" class="ml-2 truncate text-xs text-slate-400">
                                {{ option.description }}
                            </span>
                        </div>
                    </li>
                </ul>
            </div>
        </Teleport>
    </div>
</template>
