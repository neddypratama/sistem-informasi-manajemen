<script setup>
import { computed } from 'vue';
import BaseBadge from '../ui/BaseBadge.vue';
import BaseCard from '../ui/BaseCard.vue';
import CardContent from '../ui/CardContent.vue';
import { formatRp, niceMax, smoothPath } from '../../lib/dashboard';

const props = defineProps({
    arusKas: { type: Object, default: () => ({}) },
    labels: { type: Array, default: () => [] },
    granularity: { type: String, default: 'harian' },
});

const CW = 1000;
const CH = 120;
const CTOP = 10;
const CBASE = 105;
const CPAD = 10;

const inflow = computed(() => props.arusKas.pemasukanSeries ?? []);
const outflow = computed(() => props.arusKas.pengeluaranSeries ?? []);

const satuanWaktu = computed(() => (props.granularity === 'bulanan' ? 'bulan' : 'hari'));

const statusBadge = computed(() => {
    const bersih = Number(props.arusKas.bersih || 0);

    if (bersih > 0) return { variant: 'success', label: 'Surplus Sehat' };
    if (bersih < 0) return { variant: 'danger', label: 'Defisit' };

    return { variant: 'default', label: 'Seimbang' };
});

function formatBersih(value) {
    const n = Number(value || 0);
    const sign = n > 0 ? '+' : n < 0 ? '-' : '';

    return `${sign}${formatRp(Math.abs(n))}`;
}

/** Indeks bucket puncak surplus, dipakai penanda dan sorotan label sumbu. */
const puncakIndex = computed(() => {
    const label = props.arusKas.puncak?.label;

    if (label) {
        const index = props.labels.indexOf(label);
        if (index >= 0) return index;
    }

    let best = -1;
    let bestValue = 0;

    inflow.value.forEach((value, index) => {
        const selisih = Number(value) - Number(outflow.value[index] ?? 0);
        if (selisih > bestValue) {
            bestValue = selisih;
            best = index;
        }
    });

    return bestValue > 0 ? best : -1;
});

const flowChart = computed(() => {
    const n = inflow.value.length;
    if (n === 0) return null;

    const max = niceMax(Math.max(0, ...inflow.value, ...outflow.value));
    const x = (index) => (n <= 1 ? CW / 2 : +(CPAD + (index * (CW - 2 * CPAD)) / (n - 1)).toFixed(2));
    const y = (value) => +(CBASE - (max > 0 ? (Number(value) / max) * (CBASE - CTOP) : 0)).toFixed(2);

    const titikMasuk = inflow.value.map((value, index) => ({ x: x(index), y: y(value) }));
    const titikKeluar = outflow.value.map((value, index) => ({ x: x(index), y: y(value) }));

    const lineMasuk = smoothPath(titikMasuk);
    const areaMasuk = titikMasuk.length > 1 ? `${lineMasuk} L ${titikMasuk[n - 1].x} ${CBASE} L ${titikMasuk[0].x} ${CBASE} Z` : '';
    const lineKeluar = smoothPath(titikKeluar);

    return {
        lineMasuk,
        areaMasuk,
        lineKeluar,
        puncak: puncakIndex.value >= 0
            ? { masuk: titikMasuk[puncakIndex.value], keluar: titikKeluar[puncakIndex.value] }
            : null,
    };
});

/** Maksimal 5 label sumbu, label puncak surplus disorot. */
const axisLabels = computed(() => {
    const n = inflow.value.length;
    if (n === 0) return [];

    const count = Math.min(5, n);
    const indexes = [];

    for (let i = 0; i < count; i++) {
        const index = count === 1 ? 0 : Math.round((i * (n - 1)) / (count - 1));
        if (!indexes.includes(index)) indexes.push(index);
    }

    return indexes.map((index) => {
        const puncak = index === puncakIndex.value;
        const label = props.labels[index] ?? '';

        return { index, puncak, text: puncak ? `${label} (Puncak Surplus)` : label };
    });
});
</script>

<template>
    <BaseCard>
        <CardContent class="p-5">
            <div class="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div class="flex items-center gap-2">
                        <svg class="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <rect height="10" rx="2" width="20" x="2" y="7" />
                            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 11v2m-3 0h6" />
                        </svg>
                        <span class="text-base font-semibold text-slate-900">Arus Kas</span>
                        <BaseBadge :variant="statusBadge.variant">{{ statusBadge.label }}</BaseBadge>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">
                        Ringkasan likuiditas uang masuk dan keluar per {{ satuanWaktu }} dalam periode berjalan.
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2">
                        <span class="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                        <div>
                            <span class="block text-xs text-slate-500">Total Pemasukan</span>
                            <span class="text-sm font-bold text-slate-900">{{ formatRp(arusKas.pemasukan || 0) }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2">
                        <span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                        <div>
                            <span class="block text-xs text-slate-500">Total Pengeluaran</span>
                            <span class="text-sm font-bold text-slate-900">{{ formatRp(arusKas.pengeluaran || 0) }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 rounded-lg bg-emerald-600 px-4 py-2 shadow-sm">
                        <svg class="h-5 w-5 text-emerald-100" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="m5 13 4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <div>
                            <span class="block text-xs uppercase text-white/80">Arus Kas Bersih</span>
                            <span class="text-sm font-extrabold text-white">{{ formatBersih(arusKas.bersih || 0) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <template v-if="flowChart">
                <div class="mt-4 h-36 w-full">
                    <svg class="h-full w-full" fill="none" preserveAspectRatio="none" :viewBox="`0 0 ${CW} ${CH}`">
                        <defs>
                            <linearGradient id="flowGrad" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stop-color="#059669" stop-opacity="0.25" />
                                <stop offset="100%" stop-color="#059669" stop-opacity="0" />
                            </linearGradient>
                        </defs>

                        <line stroke="#eff6ff" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="1000" y1="30" y2="30" />
                        <line stroke="#eff6ff" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="1000" y1="70" y2="70" />
                        <line stroke="#cbd5e1" stroke-width="1" x1="0" x2="1000" y1="105" y2="105" />

                        <path v-if="flowChart.areaMasuk" :d="flowChart.areaMasuk" fill="url(#flowGrad)" />
                        <path :d="flowChart.lineMasuk" fill="none" stroke="#059669" stroke-linecap="round" stroke-width="2.5" />
                        <path :d="flowChart.lineKeluar" fill="none" stroke="#f97316" stroke-dasharray="4 3" stroke-linecap="round" stroke-width="2" />

                        <template v-if="flowChart.puncak">
                            <circle :cx="flowChart.puncak.masuk.x" :cy="flowChart.puncak.masuk.y" fill="#059669" r="4" stroke="#ffffff" stroke-width="2" />
                            <circle :cx="flowChart.puncak.keluar.x" :cy="flowChart.puncak.keluar.y" fill="#f97316" r="4" stroke="#ffffff" stroke-width="2" />
                        </template>
                    </svg>
                </div>

                <div class="flex items-center justify-between pt-2 text-[11px] text-slate-500">
                    <span
                        v-for="axis in axisLabels"
                        :key="axis.index"
                        :class="axis.puncak ? 'font-semibold text-emerald-600' : ''"
                    >
                        {{ axis.text }}
                    </span>
                </div>
            </template>

            <p v-else class="py-8 text-center text-sm text-slate-400">
                Belum ada mutasi kas pada periode ini.
            </p>
        </CardContent>
    </BaseCard>
</template>
