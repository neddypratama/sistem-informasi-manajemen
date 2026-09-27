<script setup>
defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, default: '' },
});

const emit = defineEmits(['close']);
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/50" aria-hidden="true" @click="emit('close')" />
            <div
                class="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
            >
                <div
                    v-if="title"
                    class="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4"
                >
                    <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
                    <button
                        type="button"
                        class="text-slate-400 hover:text-slate-600"
                        aria-label="Tutup"
                        @click="emit('close')"
                    >
                        &#10005;
                    </button>
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    <slot />
                </div>
                <div
                    v-if="$slots.footer"
                    class="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3"
                >
                    <slot name="footer" />
                </div>
            </div>
        </div>
    </Teleport>
</template>
