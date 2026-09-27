<script setup>
import { computed, ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import ChevronIcon from '../components/icons/ChevronIcon.vue';
import SidebarMenuItem from './SidebarMenuItem.vue';
import { cn } from '../lib/utils';

const props = defineProps({
    section: { type: Object, required: true },
    collapsed: { type: Boolean, default: false },
    open: { type: Boolean, default: false },
    flyoutOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle', 'select']);

const root = ref(null);

onClickOutside(root, () => {
    if (props.collapsed && props.flyoutOpen) {
        emit('select');
    }
});

const buttonClasses = computed(() =>
    cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        props.collapsed && 'justify-center px-2',
        props.section.hasActive
            ? 'text-emerald-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ),
);

const hasItems = computed(() => props.section.items.length > 0);
</script>

<template>
    <div ref="root" class="relative">
        <button
            type="button"
            :title="collapsed ? section.title : undefined"
            :class="buttonClasses"
            @click="emit('toggle')"
        >
            <span class="shrink-0">{{ section.icon }}</span>
            <template v-if="!collapsed">
                <span class="min-w-0 flex-1 truncate text-left">{{ section.title }}</span>
                <ChevronIcon :open="open" />
            </template>
        </button>

        <div v-if="!collapsed && open" class="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-2">
            <div class="space-y-1">
                <SidebarMenuItem
                    v-for="item in section.items"
                    :key="item.to"
                    :to="item.to"
                    :icon="item.icon"
                    :label="item.label"
                    @select="emit('select')"
                />
                <div v-if="!hasItems" class="px-3 py-1 text-xs text-slate-400">
                    {{ section.emptyNote }}
                </div>
            </div>
        </div>

        <div
            v-if="collapsed && flyoutOpen"
            class="absolute left-full top-0 z-50 ml-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
            <div class="px-3 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {{ section.title }}
            </div>
            <div class="space-y-1">
                <SidebarMenuItem
                    v-for="item in section.items"
                    :key="item.to"
                    :to="item.to"
                    :icon="item.icon"
                    :label="item.label"
                    @select="emit('select')"
                />
                <div v-if="!hasItems" class="px-3 py-1 text-xs text-slate-400">
                    {{ section.emptyNote }}
                </div>
            </div>
        </div>
    </div>
</template>
