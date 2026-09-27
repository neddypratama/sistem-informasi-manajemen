<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import BaseBadge from '../ui/BaseBadge.vue';
import BaseCard from '../ui/BaseCard.vue';
import BasePagination from '../ui/BasePagination.vue';
import BaseSelect from '../ui/BaseSelect.vue';
import BaseTable from '../ui/BaseTable.vue';
import CardContent from '../ui/CardContent.vue';
import EmptyState from '../ui/EmptyState.vue';
import PageLoader from '../ui/PageLoader.vue';
import TableBody from '../ui/TableBody.vue';
import TableCell from '../ui/TableCell.vue';
import TableHead from '../ui/TableHead.vue';
import TableHeader from '../ui/TableHeader.vue';
import TableRow from '../ui/TableRow.vue';
import { dashboardApi } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { formatRp, niceMax } from '../../lib/dashboard';
import { useQuery } from '../../lib/query';

const auth = useAuthStore();

const page = ref(1);
const perPage = ref(10);
const jenisId = ref(null);

const { data, isLoading } = useQuery({
    queryKey: () => ['dashboard-stok', jenisId.value, perPage.value, page.value],
    queryFn: () =>
        dashboardApi.stokPerJenis({
            jenis_barang_id: jenisId.value ?? undefined,
            per_page: perPage.value,
            page: page.value,
        }),
});

watch([jenisId, perPage], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

const opsiJenis = computed(() => data.value?.jenis ?? []);
const terpilih = computed(() => data.value?.terpilih ?? null);
const baris = computed(() => data.value?.items ?? []);
const chartItems = computed(() => data.value?.chart?.items ?? []);

/** Select memakai jenis pilihan server saat pengguna belum memilih apa pun. */
const jenisTerpilih = computed(() => jenisId.value ?? terpilih.value?.id ?? '');

const totalBadge = computed(() => {
    if (!terpilih.value) return 'Total: 0';

    return `Total: ${formatNumber(terpilih.value.totalQty)} ${terpilih.value.satuan || ''}`.trim();
});

function formatNumber(value) {
    return Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

function potongLabel(text, panjang) {
    return text.length > panjang ? `${text.slice(0, panjang - 1)}…` : text;
}

const stockChart = computed(() => {
    const items = [...chartItems.value].sort(
        (a, b) => Number(b.qty) - Number(a.qty) || String(a.nama).localeCompare(String(b.nama), 'id'),
    );
    const n = items.length;
    if (n === 0) return null;

    const plotStart = 44;
    const plotPadEnd = 16;
    const minWidth = 700;
    const tersedia = minWidth - plotStart - plotPadEnd;
    const slotTarget = Math.min(96, Math.max(48, tersedia / n));
    const width = Math.max(minWidth, plotStart + plotPadEnd + n * slotTarget);
    const slot = (width - plotStart - plotPadEnd) / n;
    const barWidth = Math.max(6, Math.min(48, slot * 0.55));
    const maxChars = Math.min(14, Math.max(6, Math.floor(slot / 6.2)));

    const max = niceMax(Math.max(0, ...items.map((item) => Number(item.qty))));
    const base = 130;
    const top = 20;
    const available = base - top;

    const bars = items.map((item, index) => {
        const qty = Number(item.qty);
        const center = plotStart + slot * (index + 0.5);
        const height = max > 0 && qty > 0 ? Math.max(3, (qty / max) * available) : 0;
        const nama = String(item.nama);

        return {
            barangId: item.barang_id,
            center: +center.toFixed(2),
            x: +(center - barWidth / 2).toFixed(2),
            y: +(base - height).toFixed(2),
            height: +height.toFixed(2),
            qty,
            label: potongLabel(nama, maxChars),
            tooltip: `${nama} (${item.kode}) · ${formatNumber(qty)} ${item.satuan} · ${formatRp(item.subtotalNilai)}`,
        };
    });

    const yTicks = [1, 0.7, 0.4, 0].map((fraction) => ({
        y: +(base - fraction * available).toFixed(2),
        label: max * fraction,
    }));

    return {
        bars,
        yTicks,
        width,
        plotStart,
        plotEnd: +(width - plotPadEnd).toFixed(2),
        barWidth,
        showValues: n <= 12,
        labelStep: Math.max(1, Math.ceil(7 / maxChars)),
        total: n,
    };
});
</script>

<template>
    <BaseCard>
        <CardContent class="p-5">
            <div class="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div class="flex items-start gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shadow-sm">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="text-base font-semibold text-slate-900">Detail Stok Barang per Kategori</span>
                            <BaseBadge variant="success">Stok Real-time</BaseBadge>
                        </div>
                        <p class="mt-1 text-xs text-slate-500">
                            Pilih jenis barang untuk memantau varian barang, jumlah stok fisik, dan komposisinya.
                        </p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-sm">
                        <span class="text-xs font-medium text-slate-500">Jenis Barang:</span>
                        <BaseSelect
                            :model-value="jenisTerpilih"
                            class="h-7 w-56 border-0 bg-transparent py-0 pr-6 text-xs font-bold text-emerald-700 shadow-none focus:ring-0"
                            @update:model-value="jenisId = $event"
                        >
                            <option v-for="opsi in opsiJenis" :key="opsi.id" :value="opsi.id">
                                {{ opsi.nama }} ({{ opsi.varian }} Varian)
                            </option>
                        </BaseSelect>
                    </div>
                    <span class="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                        {{ totalBadge }}
                    </span>
                </div>
            </div>

            <PageLoader v-if="isLoading && !data" />

            <div v-else-if="terpilih" class="flex flex-col gap-4">
                <div class="mt-4 grid grid-cols-1 gap-4 rounded-xl bg-slate-50/70 p-4 lg:grid-cols-12">
                    <div class="flex flex-col justify-between lg:col-span-8">
                        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-sm font-bold text-slate-900">Komposisi Stok Barang: {{ terpilih.nama }}</span>
                                <span class="text-[11px] text-slate-500">(Satuan {{ terpilih.satuan || '-' }})</span>
                            </div>
                            <span class="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span class="h-3 w-3 rounded-sm bg-emerald-600"></span>
                                <span class="font-medium text-slate-700">Jumlah Stok Fisik</span>
                            </span>
                        </div>

                        <p v-if="stockChart && stockChart.total > 12" class="mb-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M3 12h18m0 0-6-6m6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                            {{ stockChart.total }} varian ditampilkan semua · geser ke samping untuk melihat seluruh batang
                        </p>

                        <div v-if="stockChart" class="overflow-x-auto">
                            <svg
                                class="block h-40 w-full overflow-visible"
                                fill="none"
                                preserveAspectRatio="none"
                                :style="{ minWidth: stockChart.width + 'px' }"
                                :viewBox="`0 0 ${stockChart.width} 160`"
                            >
                                <line
                                    v-for="tick in stockChart.yTicks"
                                    :key="`sy-${tick.y}`"
                                    :x1="stockChart.plotStart"
                                    :x2="stockChart.plotEnd"
                                    :y1="tick.y"
                                    :y2="tick.y"
                                    :stroke="tick.y === 130 ? '#cbd5e1' : '#eff6ff'"
                                    stroke-dasharray="3 3"
                                    stroke-width="1"
                                />
                                <text
                                    v-for="tick in stockChart.yTicks"
                                    :key="`syl-${tick.y}`"
                                    class="text-[10px]"
                                    fill="#94a3b8"
                                    text-anchor="end"
                                    :x="stockChart.plotStart - 6"
                                    :y="tick.y + 3.5"
                                >
                                    {{ formatNumber(tick.label) }}
                                </text>

                                <g v-for="(bar, index) in stockChart.bars" :key="bar.barangId">
                                    <title>{{ bar.tooltip }}</title>
                                    <rect
                                        :height="bar.height"
                                        :width="stockChart.barWidth"
                                        :x="bar.x"
                                        :y="bar.y"
                                        fill="#059669"
                                        rx="3"
                                    />
                                    <text
                                        v-if="stockChart.showValues && bar.qty > 0"
                                        class="text-[10px] font-semibold"
                                        fill="#047857"
                                        text-anchor="middle"
                                        :x="bar.center"
                                        :y="bar.y - 6"
                                    >
                                        {{ formatNumber(bar.qty) }}
                                    </text>
                                    <text
                                        v-if="index % stockChart.labelStep === 0 || index === stockChart.bars.length - 1"
                                        class="text-[11px]"
                                        fill="#64748b"
                                        text-anchor="middle"
                                        :x="bar.center"
                                        y="148"
                                    >
                                        {{ bar.label }}
                                    </text>
                                </g>
                            </svg>
                        </div>

                        <p v-else class="py-10 text-center text-sm text-slate-400">
                            Belum ada barang pada jenis ini.
                        </p>
                    </div>

                    <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span class="text-sm font-bold text-slate-900">Ikhtisar Kategori</span>
                            <svg class="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </div>

                        <dl class="mt-2 text-xs">
                            <div class="flex items-center justify-between border-b border-slate-100 py-2">
                                <dt class="text-slate-500">Kategori Terpilih</dt>
                                <dd class="font-semibold text-slate-900">{{ terpilih.nama }}</dd>
                            </div>
                            <div class="flex items-center justify-between border-b border-slate-100 py-2">
                                <dt class="text-slate-500">Total Varian / Item</dt>
                                <dd class="font-bold text-emerald-600">{{ terpilih.varian }} Varian</dd>
                            </div>
                            <div class="flex items-center justify-between border-b border-slate-100 py-2">
                                <dt class="text-slate-500">Total Stok Fisik</dt>
                                <dd class="font-bold text-emerald-600">
                                    {{ formatNumber(terpilih.totalQty) }} {{ terpilih.satuan }}
                                </dd>
                            </div>
                            <div class="flex items-center justify-between border-b border-slate-100 py-2">
                                <dt class="text-slate-500">Estimasi Nilai Stok</dt>
                                <dd class="font-bold text-slate-900">{{ formatRp(terpilih.totalNilai) }}</dd>
                            </div>
                            <div class="flex items-center justify-between py-2">
                                <dt class="text-slate-500">Kondisi Fisik</dt>
                                <dd>
                                    <span
                                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                        :class="terpilih.totalQty > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                                    >
                                        <span class="h-1.5 w-1.5 rounded-full" :class="terpilih.totalQty > 0 ? 'bg-emerald-600' : 'bg-rose-600'"></span>
                                        {{ terpilih.kondisi }}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <BaseTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kode &amp; Nama Barang</TableHead>
                                <TableHead>Jenis / Kategori</TableHead>
                                <TableHead class="text-right">Jumlah Stok Fisik</TableHead>
                                <TableHead class="text-right">Harga Satuan</TableHead>
                                <TableHead class="text-right">Subtotal Nilai</TableHead>
                                <TableHead class="text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-if="!baris.length">
                                <TableCell colspan="6"><EmptyState message="Belum ada barang pada jenis ini." /></TableCell>
                            </TableRow>
                            <TableRow v-for="item in baris" v-else :key="item.barang_id">
                                <TableCell>
                                    <div class="flex items-center gap-2">
                                        <div class="flex h-8 w-8 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                                            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                                <path d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m7.5 0V6.75a2.25 2.25 0 0 1 2.25-2.25h1.5a2.25 2.25 0 0 1 2.25 2.25v.75m-13.5 6.75h9" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="font-semibold text-slate-900">{{ item.nama }}</span>
                                            <span class="text-[11px] text-slate-400">{{ item.kode }}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell class="text-slate-500">{{ terpilih.nama }}</TableCell>
                                <TableCell class="text-right font-semibold text-emerald-600">
                                    {{ formatNumber(item.qty) }} {{ item.satuan }}
                                </TableCell>
                                <TableCell class="text-right">{{ formatRp(item.hargaSatuan) }}</TableCell>
                                <TableCell class="text-right font-semibold text-slate-900">{{ formatRp(item.subtotalNilai) }}</TableCell>
                                <TableCell class="text-center">
                                    <RouterLink
                                        :to="{ name: 'stok' }"
                                        class="inline-flex rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                                    >
                                        Detail Stok
                                    </RouterLink>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </BaseTable>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                        <span class="font-medium">Tampilkan:</span>
                        <BaseSelect
                            :model-value="perPage"
                            class="h-7 w-32 border-0 bg-transparent py-0 pr-6 text-xs font-semibold text-slate-900 shadow-none focus:ring-0"
                            @update:model-value="perPage = Number($event)"
                        >
                            <option :value="5">5 per halaman</option>
                            <option :value="10">10 per halaman</option>
                            <option :value="25">25 per halaman</option>
                        </BaseSelect>
                    </div>
                    <div class="min-w-0 flex-1">
                        <BasePagination :paginator="data" @change="page = $event" />
                    </div>
                </div>

                <div class="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span class="text-xs text-slate-400">Stok dihitung dari batch tersisa (metode FIFO).</span>
                    <RouterLink
                        v-if="auth.hasPermission('menu.master.barang')"
                        :to="{ name: 'barang' }"
                        class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
                    >
                        Buka Manajemen Master Barang
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </RouterLink>
                </div>
            </div>

            <EmptyState v-else message="Belum ada jenis barang." />
        </CardContent>
    </BaseCard>
</template>
