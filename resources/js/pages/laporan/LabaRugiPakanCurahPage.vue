<script setup>
import { computed, ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import CardContent from '../../components/ui/CardContent.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { laporanApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, today } from '../../lib/utils';

function firstDayOfMonth() {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

const dari = ref(firstDayOfMonth());
const sampai = ref(today());

const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: () => ['laporan-laba-rugi-curah', dari.value, sampai.value],
    queryFn: () => laporanApi.labaRugiPakanCurah({ dari: dari.value, sampai: sampai.value }),
    enabled: false,
});

const labaKotor = computed(() => data.value?.labaKotor ?? 0);
const perBarang = computed(() => data.value?.perBarang ?? []);

function handleExport() {
    laporanApi.exportLabaRugiPakanCurah({ dari: dari.value, sampai: sampai.value });
}
</script>

<template>
    <div>
        <PageHeader
            title="Laba Rugi Pakan Curah"
            description="Kinerja penjualan dan HPP Pakan Curah pada periode tertentu."
        />

        <BaseCard class="mb-4">
            <CardContent class="p-4">
                <div class="flex flex-wrap items-end gap-3">
                    <div>
                        <BaseLabel for="dari">Dari</BaseLabel>
                        <BaseInput id="dari" v-model="dari" type="date" />
                    </div>
                    <div>
                        <BaseLabel for="sampai">Sampai</BaseLabel>
                        <BaseInput id="sampai" v-model="sampai" type="date" />
                    </div>
                    <BaseButton :disabled="isFetching" @click="refetch()">
                        {{ isFetching ? 'Memuat...' : 'Tampilkan' }}
                    </BaseButton>
                    <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
                </div>
            </CardContent>
        </BaseCard>

        <PageLoader v-if="isLoading" />
        <template v-else-if="data">
            <!-- Ringkasan total -->
            <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <BaseCard>
                    <CardContent class="p-5">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Total Penjualan Curah
                        </div>
                        <div class="mt-1 text-xl font-bold text-slate-800">
                            {{ formatIDR(data.totalPenjualan) }}
                        </div>
                    </CardContent>
                </BaseCard>
                <BaseCard>
                    <CardContent class="p-5">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Total HPP Curah
                        </div>
                        <div class="mt-1 text-xl font-bold text-slate-800">
                            {{ formatIDR(data.totalHpp) }}
                        </div>
                    </CardContent>
                </BaseCard>
                <BaseCard>
                    <CardContent class="p-5">
                        <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Total Stok Curah (Nominal)
                        </div>
                        <div class="mt-1 text-xl font-bold text-slate-800">
                            {{ formatIDR(data.stok.nominal) }}
                        </div>
                        <div class="mt-0.5 text-xs text-slate-400">
                            Qty: {{ data.stok.qty.toLocaleString('id-ID') }} kg
                        </div>
                    </CardContent>
                </BaseCard>
            </div>

            <!-- Rincian per barang -->
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <!-- Pendapatan per barang -->
                <BaseCard>
                    <CardContent class="p-5">
                        <div class="mb-2 text-sm font-semibold text-slate-800">Pendapatan per Barang</div>
                        <BaseTable>
                            <TableBody>
                                <TableRow v-if="perBarang.length === 0">
                                    <TableCell colspan="3">
                                        <p class="text-sm text-slate-400">Tidak ada penjualan curah.</p>
                                    </TableCell>
                                </TableRow>
                                <TableRow v-for="b in perBarang" v-else :key="b.kode">
                                    <TableCell>
                                        <div class="text-sm font-medium text-slate-800">{{ b.nama }}</div>
                                        <div class="text-xs text-slate-400">{{ b.kode }}</div>
                                    </TableCell>
                                    <TableCell class="text-right text-xs text-slate-500">
                                        {{ b.qty.toLocaleString('id-ID') }} kg
                                    </TableCell>
                                    <TableCell class="text-right text-sm">{{ formatIDR(b.penjualan) }}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell class="font-bold" colspan="2">Total Penjualan</TableCell>
                                    <TableCell class="text-right font-bold">
                                        {{ formatIDR(data.totalPenjualan) }}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </BaseTable>
                    </CardContent>
                </BaseCard>

                <!-- HPP per barang -->
                <BaseCard>
                    <CardContent class="p-5">
                        <div class="mb-2 text-sm font-semibold text-slate-800">HPP per Barang</div>
                        <BaseTable>
                            <TableBody>
                                <TableRow v-if="perBarang.length === 0">
                                    <TableCell colspan="3">
                                        <p class="text-sm text-slate-400">Tidak ada data HPP curah.</p>
                                    </TableCell>
                                </TableRow>
                                <TableRow v-for="b in perBarang" v-else :key="b.kode">
                                    <TableCell>
                                        <div class="text-sm font-medium text-slate-800">{{ b.nama }}</div>
                                        <div class="text-xs text-slate-400">{{ b.kode }}</div>
                                    </TableCell>
                                    <TableCell class="text-right text-xs text-slate-500">
                                        {{ b.qty.toLocaleString('id-ID') }} kg
                                    </TableCell>
                                    <TableCell class="text-right text-sm">{{ formatIDR(b.hpp) }}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell class="font-bold" colspan="2">Total HPP</TableCell>
                                    <TableCell class="text-right font-bold">
                                        {{ formatIDR(data.totalHpp) }}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </BaseTable>
                    </CardContent>
                </BaseCard>
            </div>

            <!-- Laba Kotor -->
            <BaseCard class="mt-4">
                <CardContent class="p-5">
                    <div class="flex justify-between text-base">
                        <span
                            class="font-semibold"
                            :class="labaKotor >= 0 ? 'text-slate-800' : 'text-rose-700'"
                        >
                            {{ labaKotor >= 0 ? 'Laba Kotor Curah' : 'Rugi Kotor Curah' }}
                        </span>
                        <span class="text-xl font-bold text-emerald-700">
                            {{ formatIDR(Math.abs(labaKotor)) }}
                        </span>
                    </div>
                </CardContent>
            </BaseCard>
        </template>
    </div>
</template>
