<script setup>
import { ref, watch } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BasePagination from '../../components/ui/BasePagination.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { stokLaporanApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, today } from '../../lib/utils';

function firstDayOfMonth() {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

const page = ref(1);
const dari = ref(firstDayOfMonth());
const sampai = ref(today());
const search = ref('');
const kelompokFilter = ref('');
const statusFilter = ref('');

const { data, isLoading } = useQuery({
    queryKey: () => [
        'stok-laporan',
        page.value,
        dari.value,
        sampai.value,
        search.value,
        kelompokFilter.value,
        statusFilter.value,
    ],
    queryFn: () =>
        stokLaporanApi.index({
            page: page.value,
            dari: dari.value || undefined,
            sampai: sampai.value || undefined,
            search: search.value || undefined,
            kelompok: kelompokFilter.value || undefined,
            status: statusFilter.value || undefined,
        }),
});

watch([dari, sampai, search, kelompokFilter, statusFilter], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function qtyNumber(value) {
    return parseFloat(value).toLocaleString('id-ID');
}

function handleExport() {
    stokLaporanApi.exportExcel({
        dari: dari.value || undefined,
        sampai: sampai.value || undefined,
        search: search.value || undefined,
        kelompok: kelompokFilter.value || undefined,
        status: statusFilter.value || undefined,
    });
}
</script>

<template>
    <div>
        <PageHeader
            title="Laporan Stok Barang"
            description="Rekap stok awal, mutasi, dan stok akhir per barang pada periode tertentu."
        >
            <template #actions>
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
            </template>
        </PageHeader>

        <div class="mb-4 flex flex-wrap items-end gap-3">
            <div>
                <BaseLabel for="dari">Dari</BaseLabel>
                <BaseInput id="dari" v-model="dari" type="date" class="w-full sm:w-40" />
            </div>
            <div>
                <BaseLabel for="sampai">Sampai</BaseLabel>
                <BaseInput id="sampai" v-model="sampai" type="date" class="w-full sm:w-40" />
            </div>
            <BaseInput
                v-model="search"
                placeholder="Cari nama/kode barang..."
                class="w-full sm:w-56"
            />
            <BaseSelect v-model="kelompokFilter" class="w-full sm:w-40">
                <option value="">Kelompok: Semua</option>
                <option value="telur">Telur</option>
                <option value="pakan">Pakan</option>
                <option value="obat">Obat</option>
                <option value="tray">Tray</option>
            </BaseSelect>
            <BaseSelect v-model="statusFilter" class="w-full sm:w-36">
                <option value="">Status: Semua</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
            </BaseSelect>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Barang</TableHead>
                        <TableHead class="text-right">Stok Awal</TableHead>
                        <TableHead class="text-right">Pembelian</TableHead>
                        <TableHead class="text-right">Penjualan</TableHead>
                        <TableHead class="text-right">Retur Pembelian</TableHead>
                        <TableHead class="text-right">Retur Penjualan</TableHead>
                        <TableHead class="text-right">Stok Akhir</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="8"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="8"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow v-for="baris in data.data" v-else :key="baris.barang_id">
                        <TableCell>{{ baris.kode }}</TableCell>
                        <TableCell>
                            <div class="font-medium">{{ baris.nama }}</div>
                            <div class="text-xs text-slate-400">{{ baris.satuan }}</div>
                        </TableCell>
                        <TableCell class="text-right">
                            {{ qtyNumber(baris.stok_awal) }}
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="font-semibold">{{ qtyNumber(baris.pembelian.qty) }}</div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(baris.pembelian.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="font-semibold">{{ qtyNumber(baris.penjualan.qty) }}</div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(baris.penjualan.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="font-semibold">
                                {{ qtyNumber(baris.retur_pembelian.qty) }}
                            </div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(baris.retur_pembelian.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right">
                            <div class="font-semibold">
                                {{ qtyNumber(baris.retur_penjualan.qty) }}
                            </div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(baris.retur_penjualan.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right font-semibold">
                            {{ qtyNumber(baris.stok_akhir) }}
                        </TableCell>
                    </TableRow>
                    <TableRow
                        v-if="!isLoading && data?.data?.length && data.total_keseluruhan"
                    >
                        <TableCell class="font-bold" colspan="2">Total Keseluruhan</TableCell>
                        <TableCell class="text-right font-bold">
                            {{ qtyNumber(data.total_keseluruhan.stok_awal) }}
                        </TableCell>
                        <TableCell class="text-right font-bold">
                            <div>{{ qtyNumber(data.total_keseluruhan.pembelian.qty) }}</div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(data.total_keseluruhan.pembelian.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right font-bold">
                            <div>{{ qtyNumber(data.total_keseluruhan.penjualan.qty) }}</div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(data.total_keseluruhan.penjualan.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right font-bold">
                            <div>{{ qtyNumber(data.total_keseluruhan.retur_pembelian.qty) }}</div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(data.total_keseluruhan.retur_pembelian.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right font-bold">
                            <div>{{ qtyNumber(data.total_keseluruhan.retur_penjualan.qty) }}</div>
                            <div class="text-xs text-slate-400">
                                {{ formatIDR(data.total_keseluruhan.retur_penjualan.nilai) }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right font-bold">
                            {{ qtyNumber(data.total_keseluruhan.stok_akhir) }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
