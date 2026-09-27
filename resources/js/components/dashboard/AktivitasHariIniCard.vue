<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import BaseCard from '../ui/BaseCard.vue';
import CardContent from '../ui/CardContent.vue';
import { useAuthStore } from '../../stores/auth';
import { formatRp } from '../../lib/dashboard';

const props = defineProps({
    aktivitas: { type: Object, default: () => ({}) },
});

const auth = useAuthStore();

const tiles = computed(() => {
    const data = props.aktivitas ?? {};

    return [
        {
            key: 'transaksi',
            label: 'Transaksi Hari Ini',
            value: formatNumber(data.transaksi?.jumlah),
            hint: formatRp(data.transaksi?.total),
            icon: 'banknote',
            tone: 'text-emerald-600',
        },
        {
            key: 'barang',
            label: 'Barang Aktif',
            value: formatNumber(data.barangAktif),
            hint: 'SKU terdaftar',
            icon: 'package',
            tone: 'text-sky-600',
        },
        {
            key: 'client',
            label: 'Client Aktif',
            value: formatNumber(data.clientAktif),
            hint: 'Mitra & Pelanggan',
            icon: 'users',
            tone: 'text-emerald-600',
        },
        {
            key: 'hutang',
            label: 'Hutang > Piutang',
            value: formatNumber(data.hutangLebihBesar?.jumlah),
            hint: `Selisih: ${formatRp(data.hutangLebihBesar?.selisih)}`,
            icon: 'scale',
            tone: 'text-amber-600',
            suffix: 'Mitra',
            emphasis: true,
        },
    ];
});

const jurnalSeimbang = computed(() => props.aktivitas?.jurnal?.seimbang !== false);

function formatNumber(value) {
    return Number(value || 0).toLocaleString('id-ID');
}
</script>

<template>
    <BaseCard>
        <CardContent class="p-5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <svg class="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="text-base font-semibold text-slate-900">Ringkasan Aktivitas Hari Ini</span>
                </div>
                <span class="text-xs font-medium text-slate-400">{{ aktivitas?.tanggalLabel || '-' }}</span>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                    v-for="tile in tiles"
                    :key="tile.key"
                    class="flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-medium text-slate-500">{{ tile.label }}</span>
                        <svg class="h-[18px] w-[18px] shrink-0" :class="tile.tone" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                            <template v-if="tile.icon === 'banknote'">
                                <rect height="12" rx="2" width="20" x="2" y="6" />
                                <circle cx="12" cy="12" r="2" />
                                <path d="M6 12h.01M18 12h.01" />
                            </template>
                            <template v-else-if="tile.icon === 'package'">
                                <path d="m7.5 4.27 9 5.15" />
                                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                                <path d="m3.3 7 8.7 5 8.7-5" />
                                <path d="M12 22V12" />
                            </template>
                            <template v-else-if="tile.icon === 'users'">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </template>
                            <template v-else>
                                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                                <path d="M7 21h10" />
                                <path d="M12 3v18" />
                                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
                            </template>
                        </svg>
                    </div>
                    <div class="mt-2">
                        <div class="flex items-baseline gap-1.5">
                            <span
                                class="text-2xl font-bold leading-none"
                                :class="tile.emphasis ? 'text-amber-700' : 'text-slate-900'"
                            >
                                {{ tile.value }}
                            </span>
                            <span v-if="tile.suffix" class="text-xs font-semibold text-amber-700">{{ tile.suffix }}</span>
                        </div>
                        <span class="mt-1 block truncate text-xs text-slate-500">{{ tile.hint }}</span>
                    </div>
                </div>
            </div>

            <div
                class="mt-4 flex items-center justify-between rounded-lg bg-slate-100 p-3"
                :class="jurnalSeimbang ? '' : 'bg-amber-50'"
            >
                <div class="flex items-center gap-3">
                    <svg
                        class="h-6 w-6 shrink-0"
                        :class="jurnalSeimbang ? 'text-emerald-600' : 'text-amber-600'"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        viewBox="0 0 24 24"
                    >
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                        <path d="m9 12 2 2 4-4" />
                    </svg>
                    <div>
                        <span class="block text-sm font-semibold text-slate-900">
                            {{ jurnalSeimbang ? 'Buku Kas Telah Seimbang (Balanced)' : 'Jurnal Belum Seimbang' }}
                        </span>
                        <span class="text-xs text-slate-500">
                            {{
                                jurnalSeimbang
                                    ? 'Jurnal debit & kredit terverifikasi otomatis sistem ERP.'
                                    : `${aktivitas?.jurnal?.tidakSeimbang ?? 0} jurnal perlu diperiksa.`
                            }}
                        </span>
                    </div>
                </div>
                <svg
                    class="h-5 w-5 shrink-0"
                    :class="jurnalSeimbang ? 'text-emerald-600' : 'text-amber-600'"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    viewBox="0 0 24 24"
                >
                    <template v-if="jurnalSeimbang">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                    </template>
                    <template v-else>
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                    </template>
                </svg>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <span class="text-xs text-slate-500">
                    Audit Otomatis Terakhir:
                    <span class="font-semibold text-slate-700">
                        {{ aktivitas?.auditTerakhir ? `${aktivitas.auditTerakhir} WIB` : 'Belum ada aktivitas' }}
                    </span>
                </span>
                <RouterLink
                    v-if="auth.hasPermission('menu.akses.log')"
                    :to="{ name: 'log-aktivitas' }"
                    class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
                >
                    Lihat Log Audit
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="m12 5 7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </RouterLink>
            </div>
        </CardContent>
    </BaseCard>
</template>
