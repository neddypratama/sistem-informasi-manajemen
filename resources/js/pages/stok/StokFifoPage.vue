<script setup>
import { ref, watch } from 'vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BasePagination from '../../components/ui/BasePagination.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { stokApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, formatTanggal } from '../../lib/utils';

const page = ref(1);
const search = ref('');

const { data, isLoading } = useQuery({
    queryKey: () => ['stok-fifo', page.value, search.value],
    queryFn: () => stokApi.fifo({ page: page.value, search: search.value || undefined }),
});

watch(search, () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function qty(value) {
    return parseFloat(value).toLocaleString('id-ID');
}

function nilaiSisa(batch) {
    return formatIDR(parseFloat(batch.qty_sisa) * parseFloat(batch.harga_beli));
}
</script>

<template>
    <div>
        <PageHeader
            title="Stok FIFO"
            description="Batch pembelian berdasarkan metode masuk-pertama keluar-pertama."
        />
        <div class="mb-4">
            <BaseInput v-model="search" placeholder="Cari nama/kode barang..." class="w-full sm:w-60" />
        </div>
        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Barang</TableHead>
                        <TableHead>Tanggal Masuk</TableHead>
                        <TableHead class="text-right">Qty Masuk</TableHead>
                        <TableHead class="text-right">Qty Sisa</TableHead>
                        <TableHead class="text-right">Harga Beli</TableHead>
                        <TableHead class="text-right">Nilai Sisa</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="6"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="6"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow v-for="batch in data.data" v-else :key="batch.id">
                        <TableCell class="font-medium">
                            {{ batch.barang?.nama_barang }}
                            <div class="text-xs text-slate-400">{{ batch.barang?.kode_barang }}</div>
                        </TableCell>
                        <TableCell>{{ formatTanggal(batch.tanggal) }}</TableCell>
                        <TableCell class="text-right">{{ qty(batch.qty_masuk) }}</TableCell>
                        <TableCell class="text-right font-semibold">{{ qty(batch.qty_sisa) }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(batch.harga_beli) }}</TableCell>
                        <TableCell class="text-right font-medium">{{ nilaiSisa(batch) }}</TableCell>
                    </TableRow>
                    <TableRow v-if="!isLoading && data?.data?.length && data.total_qty_sisa !== undefined">
                        <TableCell colspan="3" class="font-bold">Total Keseluruhan</TableCell>
                        <TableCell class="text-right font-bold">{{ qty(data.total_qty_sisa) }}</TableCell>
                        <TableCell />
                        <TableCell class="text-right font-bold">{{ formatIDR(data.total_nilai_sisa) }}</TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
