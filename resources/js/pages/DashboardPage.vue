<script setup>
import { computed, ref, watch } from 'vue';
import AktivitasHariIniCard from '../components/dashboard/AktivitasHariIniCard.vue';
import ArusKasCard from '../components/dashboard/ArusKasCard.vue';
import StokPerJenisCard from '../components/dashboard/StokPerJenisCard.vue';
import BaseBadge from '../components/ui/BaseBadge.vue';
import BaseButton from '../components/ui/BaseButton.vue';
import BaseCard from '../components/ui/BaseCard.vue';
import BaseInput from '../components/ui/BaseInput.vue';
import CardContent from '../components/ui/CardContent.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import PageLoader from '../components/ui/PageLoader.vue';
import StatCard from '../components/ui/StatCard.vue';
import { dashboardApi } from '../api';
import {
    formatAxis,
    formatDelta,
    formatRingkas,
    formatRp,
    growthClass,
    growthHint,
    niceMax,
    smoothPath,
} from '../lib/dashboard';
import { useQuery } from '../lib/query';
import { formatIDR } from '../lib/utils';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

const bisaLihatDashboard = computed(() => ['SuperAdmin', 'Admin'].includes(auth.user?.role?.name ?? ''));
const namaUser = computed(() => (auth.user?.name ?? 'Teman').trim());
const roleUser = computed(() => auth.user?.role?.name ?? 'Tanpa role');
const inisialUser = computed(() => (namaUser.value || 'T').charAt(0).toUpperCase());

const PRESET_OPTIONS = [
    { value: 'hari_ini', label: 'Hari ini' },
    { value: '7_hari', label: '7 hari' },
    { value: 'bulan_ini', label: 'Bulan ini' },
    { value: 'tahun_ini', label: 'Tahun ini' },
    { value: 'custom', label: 'Custom' },
];

function toYmd(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const preset = ref('bulan_ini');

function bulanIni() {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const dari = ref(bulanIni());
const sampai = ref(toYmd(new Date()));

const params = computed(() =>
    preset.value === 'custom' ? { preset: 'custom', dari: dari.value, sampai: sampai.value } : { preset: preset.value },
);

const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', params],
    queryFn: () => dashboardApi.index(params.value),
    enabled: () => bisaLihatDashboard.value,
});

const lastUpdated = ref('');
watch(data, (value) => {
    if (value) lastUpdated.value = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
});

const kpi = computed(
    () =>
        data.value?.kpi ?? {
            penjualan: 0,
            penjualanGrowth: null,
            pembelian: 0,
            pembelianGrowth: null,
            nilaiPersediaan: 0,
            jumlahStok: 0,
            piutang: 0,
            piutangJumlah: 0,
            hutang: 0,
            hutangJumlah: 0,
            kasBank: 0,
            kasBankLabel: 'Kas & Bank',
        },
);

const chart = computed(
    () =>
        data.value?.chart ?? {
            granularity: '',
            labels: [],
            penjualan: [],
            pembelian: [],
            hpp: [],
            labaKotor: 0,
            margin: null,
        },
);

const periodeLabel = computed(() => data.value?.periode?.label ?? '');

const arusKas = computed(
    () =>
        data.value?.arusKas ?? {
            pemasukan: 0,
            pengeluaran: 0,
            bersih: 0,
            pemasukanSeries: [],
            pengeluaranSeries: [],
            puncak: null,
        },
);

const aktivitas = computed(() => data.value?.aktivitasHariIni ?? {});

const hariSpan = computed(() => {
    const p = data.value?.periode;
    if (!p) return 1;

    const start = new Date(`${p.dari}T00:00:00`);
    const end = new Date(`${p.sampai}T00:00:00`);

    return Math.max(1, Math.round((end - start) / 86400000) + 1);
});

const rataRataHarian = computed(() => formatRp(kpi.value.penjualan / hariSpan.value));

// --- Geometri grafik area (Grafik Penjualan) ---
const W = 540;
const H = 210;
const TOP = 20;
const BASE = 180;
const LEFT = 45;
const RIGHT = 14;

const areaChart = computed(() => {
    const values = chart.value.penjualan;
    const labels = chart.value.labels;
    const n = values.length;
    const max = niceMax(Math.max(0, ...values));

    const points = values.map((value, index) => ({
        x: n <= 1 ? (LEFT + W - RIGHT) / 2 : +(LEFT + (index * (W - LEFT - RIGHT)) / (n - 1)).toFixed(2),
        y: +(BASE - (max > 0 ? (value / max) * (BASE - TOP) : 0)).toFixed(2),
        value,
        label: labels[index] ?? '',
    }));

    const linePath = smoothPath(points);
    const areaPath = points.length
        ? `${linePath} L ${points[points.length - 1].x} ${BASE} L ${points[0].x} ${BASE} Z`
        : '';

    const yTicks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => ({
        y: +(BASE - fraction * (BASE - TOP)).toFixed(2),
        label: formatAxis(max * fraction),
    }));

    const count = Math.min(n, 7);
    const xTickIndexes = [];
    for (let i = 0; i < count; i++) {
        const index = count <= 1 ? 0 : Math.round((i * (n - 1)) / (count - 1));
        if (!xTickIndexes.includes(index)) xTickIndexes.push(index);
    }

    let peak = null;
    points.forEach((point) => {
        if (point.value > 0 && (peak === null || point.value > peak.value)) peak = point;
    });

    return { points, linePath, areaPath, yTicks, xTickIndexes, peak, max };
});

const callout = computed(() => {
    const peak = areaChart.value.peak;
    if (!peak) return null;

    const width = 128;
    const x = Math.min(Math.max(peak.x - width / 2, 4), W - width - 4);

    return { x, y: Math.max(peak.y - 34, 0), width, text: `${peak.label}: ${formatRp(peak.value)}` };
});

// --- Geometri grafik batang (Pembelian vs Penjualan) ---
const barChart = computed(() => {
    const penjualan = chart.value.penjualan;
    const pembelian = chart.value.pembelian;
    const labels = chart.value.labels;
    const n = labels.length;
    const max = niceMax(Math.max(0, ...penjualan, ...pembelian));

    const innerLeft = 40;
    const innerRight = 12;
    const groupWidth = n > 0 ? (W - innerLeft - innerRight) / n : 0;
    const gap = Math.min(4, groupWidth * 0.08);
    const barWidth = Math.max(2, Math.min(16, groupWidth * 0.3));

    const groups = labels.map((label, index) => {
        const center = innerLeft + groupWidth * (index + 0.5);
        const valuePenjualan = Number(penjualan[index] ?? 0);
        const valuePembelian = Number(pembelian[index] ?? 0);

        return {
            label,
            center: +center.toFixed(2),
            xPenjualan: +(center - gap / 2 - barWidth).toFixed(2),
            xPembelian: +(center + gap / 2).toFixed(2),
            hPenjualan: +(max > 0 ? (valuePenjualan / max) * (BASE - TOP) : 0).toFixed(2),
            hPembelian: +(max > 0 ? (valuePembelian / max) * (BASE - TOP) : 0).toFixed(2),
            valuePenjualan,
            valuePembelian,
            showValues: n <= 8,
        };
    });

    const yTicks = [1, 0.75, 0.5, 0.25, 0].map((fraction) => ({
        y: +(BASE - fraction * (BASE - TOP)).toFixed(2),
        label: formatAxis(max * fraction),
    }));

    const labelStep = Math.max(1, Math.ceil(n / 8));

    return { groups, yTicks, barWidth, labelStep, max };
});

const marginBadge = computed(() => {
    const margin = chart.value.margin;
    if (margin === null || margin === undefined) return 'Margin —';

    return `Margin ${formatDelta(margin) ?? '0%'}`;
});
</script>

<template>
    <div v-if="!bisaLihatDashboard">
        <PageHeader title="Dashboard" description="Ringkasan akses akun Anda." />
        <BaseCard>
            <CardContent class="p-6">
                <div class="flex flex-col items-center gap-3 py-10 text-center">
                    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700">
                        {{ inisialUser }}
                    </div>
                    <h2 class="text-lg font-semibold text-slate-900">Selamat datang, {{ namaUser }}!</h2>
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {{ roleUser }}
                    </span>
                    <p class="max-w-md text-sm text-slate-500">
                        Dashboard ringkas hanya tersedia untuk Admin dan SuperAdmin. Silakan gunakan menu di samping
                        untuk membuka layanan yang Anda miliki aksesnya.
                    </p>
                </div>
            </CardContent>
        </BaseCard>
    </div>

    <PageLoader v-else-if="isLoading || !data" />
    <div v-else>
        <PageHeader title="Dashboard" description="Pantau aktivitas transaksi, persediaan, dan keuangan bisnis Anda.">
            <template #actions>
                <div class="flex flex-wrap items-center gap-2">
                    <div class="inline-flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
                        <button
                            v-for="option in PRESET_OPTIONS"
                            :key="option.value"
                            type="button"
                            class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                            :class="
                                preset === option.value
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            "
                            @click="preset = option.value"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                    <BaseButton variant="outline" size="sm" :disabled="isFetching" @click="refetch()">
                        <span :class="{ 'animate-spin': isFetching }">&#8635;</span>
                        {{ lastUpdated ? `Diperbarui ${lastUpdated}` : 'Segarkan' }}
                    </BaseButton>
                </div>
            </template>
        </PageHeader>

        <div v-if="preset === 'custom'" class="mb-4 flex flex-wrap items-end gap-3">
            <div>
                <label class="mb-1 block text-xs text-slate-500">Dari tanggal</label>
                <BaseInput v-model="dari" type="date" class="w-44" />
            </div>
            <div>
                <label class="mb-1 block text-xs text-slate-500">Sampai tanggal</label>
                <BaseInput v-model="sampai" type="date" class="w-44" />
            </div>
            <p class="pb-2 text-xs text-slate-400">Periode: {{ periodeLabel }}</p>
        </div>

        <!-- 6 KPI -->
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Penjualan" :value="formatRingkas(kpi.penjualan)" :hint="growthHint(kpi.penjualanGrowth)" :hint-class="growthClass(kpi.penjualanGrowth)">
                <template #icon>
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
                    </svg>
                </template>
            </StatCard>

            <StatCard label="Pembelian" :value="formatRingkas(kpi.pembelian)" :hint="growthHint(kpi.pembelianGrowth)" :hint-class="growthClass(kpi.pembelianGrowth)">
                <template #icon>
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                </template>
            </StatCard>

            <StatCard label="Nilai Persediaan" :value="formatRingkas(kpi.nilaiPersediaan)" :hint="`${formatIDR(kpi.jumlahStok)} unit stok`">
                <template #icon>
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                </template>
            </StatCard>

            <StatCard
                label="Piutang (AR)"
                :value="formatRingkas(kpi.piutang)"
                :hint="`${kpi.piutangJumlah} invoice aktif`"
                value-class="text-amber-600"
                hint-class="text-amber-600"
            >
                <template #icon>
                    <svg class="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                    </svg>
                </template>
            </StatCard>

            <StatCard
                label="Hutang (AP)"
                :value="formatRingkas(kpi.hutang)"
                :hint="`${kpi.hutangJumlah} tagihan belum lunas`"
                value-class="text-rose-600"
                hint-class="text-rose-500"
            >
                <template #icon>
                    <svg class="h-5 w-5 text-rose-500" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                </template>
            </StatCard>

            <StatCard
                label="Kas & Bank"
                :value="formatRingkas(kpi.kasBank)"
                :hint="kpi.kasBankLabel"
                value-class="text-emerald-600"
            >
                <template #icon>
                    <svg class="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24">
                        <path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                    </svg>
                </template>
            </StatCard>
        </div>

        <!-- Analitik -->
        <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <!-- Grafik Penjualan -->
            <BaseCard>
                <CardHeader>
                    <div>
                        <div class="flex items-center gap-2">
                            <CardTitle>Grafik Penjualan</CardTitle>
                            <BaseBadge v-if="formatDelta(kpi.penjualanGrowth)" variant="success">
                                {{ formatDelta(kpi.penjualanGrowth) }}
                            </BaseBadge>
                        </div>
                        <p class="mt-1 text-xs text-slate-500">
                            Tren penjualan berdasarkan periode {{ periodeLabel }}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="my-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2">
                        <div>
                            <span class="text-xs text-slate-500">Total Terrealisasi:</span>
                            <span class="ml-2 text-sm font-semibold text-slate-900">{{ formatRp(kpi.penjualan) }}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-xs text-slate-500">Rata-rata/hari:</span>
                            <span class="ml-2 text-sm font-semibold text-emerald-600">{{ rataRataHarian }}</span>
                        </div>
                    </div>

                    <div class="h-64 w-full">
                        <svg class="h-full w-full overflow-visible" fill="none" preserveAspectRatio="none" :viewBox="`0 0 ${W} ${H}`">
                            <defs>
                                <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stop-color="#059669" stop-opacity="0.32" />
                                    <stop offset="70%" stop-color="#059669" stop-opacity="0.06" />
                                    <stop offset="100%" stop-color="#059669" stop-opacity="0" />
                                </linearGradient>
                            </defs>

                            <line
                                v-for="tick in areaChart.yTicks"
                                :key="`ay-${tick.y}`"
                                :x1="LEFT"
                                :x2="W - RIGHT"
                                :y1="tick.y"
                                :y2="tick.y"
                                :stroke="tick.y === BASE ? '#cbd5e1' : '#eff6ff'"
                                stroke-dasharray="3 3"
                                stroke-width="1"
                            />
                            <text
                                v-for="tick in areaChart.yTicks"
                                :key="`ayl-${tick.y}`"
                                class="text-[10px]"
                                fill="#94a3b8"
                                text-anchor="end"
                                :x="LEFT - 8"
                                :y="tick.y + 3.5"
                            >
                                {{ tick.label }}
                            </text>

                            <path v-if="areaChart.areaPath" :d="areaChart.areaPath" fill="url(#areaGrad)" />
                            <path
                                v-if="areaChart.linePath"
                                :d="areaChart.linePath"
                                fill="none"
                                stroke="#059669"
                                stroke-linecap="round"
                                stroke-width="2.5"
                            />

                            <g v-if="areaChart.peak && callout">
                                <line
                                    :x1="areaChart.peak.x"
                                    :x2="areaChart.peak.x"
                                    :y1="areaChart.peak.y"
                                    :y2="BASE"
                                    stroke="#059669"
                                    stroke-dasharray="2 2"
                                    stroke-width="1.5"
                                />
                                <circle :cx="areaChart.peak.x" :cy="areaChart.peak.y" fill="#ffffff" r="4.5" stroke="#059669" stroke-width="2.5" />
                                <rect :x="callout.x" :y="callout.y" :width="callout.width" fill="#0f172a" height="22" rx="4" />
                                <text
                                    fill="#ffffff"
                                    font-size="10"
                                    font-weight="600"
                                    text-anchor="middle"
                                    :x="callout.x + callout.width / 2"
                                    :y="callout.y + 14.5"
                                >
                                    {{ callout.text }}
                                </text>
                            </g>

                            <text
                                v-for="index in areaChart.xTickIndexes"
                                :key="`ax-${index}`"
                                class="text-[10px]"
                                fill="#94a3b8"
                                text-anchor="middle"
                                :x="areaChart.points[index]?.x"
                                :y="BASE + 18"
                            >
                                {{ areaChart.points[index]?.label }}
                            </text>
                        </svg>
                    </div>
                </CardContent>
            </BaseCard>

            <!-- Pembelian vs Penjualan -->
            <BaseCard>
                <CardHeader>
                    <div>
                        <div class="flex items-center gap-2">
                            <CardTitle>Pembelian vs Penjualan</CardTitle>
                            <BaseBadge variant="info">{{ marginBadge }}</BaseBadge>
                        </div>
                        <p class="mt-1 text-xs text-slate-500">
                            Perbandingan nilai transaksi per {{ chart.granularity === 'harian' ? 'hari' : 'bulan' }}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="my-2 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-2">
                        <div class="flex flex-wrap items-center gap-4">
                            <span class="flex items-center gap-1.5 text-xs text-slate-600">
                                <span class="h-3 w-3 rounded-sm bg-emerald-600"></span>
                                Penjualan: <strong>{{ formatRingkas(kpi.penjualan) }}</strong>
                            </span>
                            <span class="flex items-center gap-1.5 text-xs text-slate-600">
                                <span class="h-3 w-3 rounded-sm bg-slate-500"></span>
                                Pembelian: <strong>{{ formatRingkas(kpi.pembelian) }}</strong>
                            </span>
                        </div>
                        <span class="text-xs font-semibold text-emerald-600">Laba Kotor: {{ formatRingkas(chart.labaKotor) }}</span>
                    </div>

                    <div class="h-64 w-full">
                        <svg class="h-full w-full overflow-visible" fill="none" preserveAspectRatio="none" :viewBox="`0 0 ${W} ${H}`">
                            <line
                                v-for="tick in barChart.yTicks"
                                :key="`by-${tick.y}`"
                                :x1="40"
                                :x2="W - 12"
                                :y1="tick.y"
                                :y2="tick.y"
                                :stroke="tick.y === BASE ? '#cbd5e1' : '#eff6ff'"
                                stroke-dasharray="3 3"
                                stroke-width="1"
                            />
                            <text
                                v-for="tick in barChart.yTicks"
                                :key="`byl-${tick.y}`"
                                class="text-[10px]"
                                fill="#94a3b8"
                                text-anchor="end"
                                :x="34"
                                :y="tick.y + 3.5"
                            >
                                {{ tick.label }}
                            </text>

                            <g v-for="(group, index) in barChart.groups" :key="`g-${index}`">
                                <rect
                                    :height="group.hPenjualan"
                                    :width="barChart.barWidth"
                                    :x="group.xPenjualan"
                                    :y="BASE - group.hPenjualan"
                                    fill="#059669"
                                    rx="2"
                                />
                                <rect
                                    :height="group.hPembelian"
                                    :width="barChart.barWidth"
                                    :x="group.xPembelian"
                                    :y="BASE - group.hPembelian"
                                    fill="#64748b"
                                    rx="2"
                                />
                                <text
                                    v-if="group.showValues && group.valuePenjualan > 0"
                                    class="text-[9px]"
                                    fill="#059669"
                                    font-weight="600"
                                    text-anchor="middle"
                                    :x="group.xPenjualan + barChart.barWidth / 2"
                                    :y="BASE - group.hPenjualan - 5"
                                >
                                    {{ formatAxis(group.valuePenjualan) }}
                                </text>
                                <text
                                    v-if="group.showValues && group.valuePembelian > 0"
                                    class="text-[9px]"
                                    fill="#64748b"
                                    font-weight="600"
                                    text-anchor="middle"
                                    :x="group.xPembelian + barChart.barWidth / 2"
                                    :y="BASE - group.hPembelian - 5"
                                >
                                    {{ formatAxis(group.valuePembelian) }}
                                </text>
                                <text
                                    v-if="index % barChart.labelStep === 0"
                                    class="text-[10px]"
                                    fill="#64748b"
                                    text-anchor="middle"
                                    :x="group.center"
                                    :y="BASE + 18"
                                >
                                    {{ group.label }}
                                </text>
                            </g>
                        </svg>
                    </div>
                </CardContent>
            </BaseCard>
        </div>

        <!-- Ringkasan Aktivitas Hari Ini -->
        <div class="mt-4">
            <AktivitasHariIniCard :aktivitas="aktivitas" />
        </div>

        <!-- Arus Kas -->
        <div class="mt-4">
            <ArusKasCard :arus-kas="arusKas" :labels="chart.labels" :granularity="chart.granularity" />
        </div>

        <!-- Detail Stok per Jenis -->
        <div class="mt-4">
            <StokPerJenisCard />
        </div>
    </div>
</template>
