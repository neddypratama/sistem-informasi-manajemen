<script setup>
import { computed, ref, useAttrs, watch } from 'vue';
import { attrsWithoutClass, cn, formatIDR, parseMoney } from '../../lib/utils';

defineOptions({ inheritAttrs: false });

defineProps({
    placeholder: { type: String, default: '0' },
});

const model = defineModel({ default: null });

const attrs = useAttrs();

const text = ref(formatText(model.value));

watch(model, (value) => {
    const next = formatText(value);

    // Hindari menimpa ketikan pengguna ketika nilai numeriknya tidak berubah.
    if (parseMoney(text.value) !== parseMoney(next) || next === '') {
        text.value = next;
    }
});

const classes = computed(() =>
    cn(
        'flex h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-right text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50',
        attrs.class,
    ),
);

const rest = computed(() => attrsWithoutClass(attrs));

function formatText(value) {
    return value == null || value === '' ? '' : formatIDR(parseMoney(value));
}

/**
 * Tampilkan format id-ID secara live, namun simpan nilai numerik ke model.
 */
function handleInput(event) {
    const numeric = parseMoney(event.target.value);

    text.value = formatIDR(numeric);
    event.target.value = text.value;
    model.value = numeric;
}
</script>

<template>
    <div class="relative w-full">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            Rp
        </span>
        <input
            type="text"
            inputmode="decimal"
            :value="text"
            :placeholder="placeholder"
            :class="classes"
            v-bind="rest"
            @input="handleInput"
        >
    </div>
</template>
