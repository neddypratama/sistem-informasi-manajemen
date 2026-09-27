<script setup>
import { computed, ref, watch } from 'vue';
import BaseBadge from '../../components/ui/BaseBadge.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
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
import { stokOpnameApi } from '../../api';
import { invalidateQueries, useQuery } from '../../lib/query';
import { formatTanggal } from '../../lib/utils';

const page = ref(1);
const search = ref('');
const statusFilter = ref('');

const { data, isLoading } = useQuery({
    queryKey: () => ['stok-opname', page.value, search.value, statusFilter.value],
    queryFn: () =>
        stokOpnameApi.index({
            page: page.value,
            search: search.value || undefined,
            status: statusFilter.value || undefined,
        }),
});

watch([search, statusFilter], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

const rows = computed(() => data.value?.data ?? []);

function formatSelisih(value) {
    const n = Number(value || 0);
    return n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function handleExport() {
    stokOpnameApi.exportExcel({
        search: search.value || undefined,
        status: statusFilter.value || undefined,
    });
}
</script>

<template>
    <div>
        <div class="flex items-start justify-between gap-4">
            <PageHeader title="Stok Opname" description="Riwayat perhitungan stok fisik & selisihnya." />
            <div class="flex gap-2">
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
                <BaseButton @click="$router.push('/stok/opname/baru')">+ Buat Opname</BaseButton>
            </div>
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="search" placeholder="Cari no opname..." class="w-full sm:w-56" />
            <BaseSelect v-model="statusFilter" class="w-full sm:w-36">
                <option value="">Status: Semua</option>
                <option value="draft">Draft</option>
                <option value="selesai">Selesai</option>
            </BaseSelect>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>No Opname</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead class="text-right">Jumlah Barang</TableHead>
                        <TableHead class="text-right">Nilai Selisih</TableHead>
                        <TableHead>Dibuat Oleh</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="6"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="rows.length === 0">
                        <TableCell colspan="6"><EmptyState message="Belum ada stok opname." /></TableCell>
                    </TableRow>
                    <template v-else>
                        <TableRow
                            v-for="row in rows"
                            :key="row.id"
                            class="cursor-pointer hover:bg-slate-50"
                            @click="$router.push(`/stok/opname/${row.id}`)"
                        >
                            <TableCell class="font-medium">{{ row.no_opname }}</TableCell>
                            <TableCell>{{ formatTanggal(row.tanggal) }}</TableCell>
                            <TableCell>
                                <BaseBadge :variant="row.status === 'selesai' ? 'success' : 'warning'">
                                    {{ row.status }}
                                </BaseBadge>
                            </TableCell>
                            <TableCell class="text-right">{{ row.jumlah_barang }}</TableCell>
                            <TableCell class="text-right font-semibold">{{ formatSelisih(row.selisih) }}</TableCell>
                            <TableCell>{{ row.created_by || '-' }}</TableCell>
                        </TableRow>
                        <TableRow v-if="rows.length > 0 && data?.total_nilai_selisih !== undefined">
                            <TableCell colspan="3" class="font-bold">Total Keseluruhan</TableCell>
                            <TableCell class="text-right font-bold">
                                {{ formatSelisih(data.total_nilai_selisih) }}
                            </TableCell>
                            <TableCell colspan="2" />
                        </TableRow>
                    </template>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>