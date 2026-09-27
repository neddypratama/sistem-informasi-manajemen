<script setup>
import { ref, watch } from 'vue';
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
import { stokApi } from '../../api';
import { useQuery } from '../../lib/query';

const page = ref(1);
const search = ref('');
const kelompokFilter = ref('');
const statusFilter = ref('');
const sortKey = ref('nama_barang');
const sortOrder = ref('asc');

const { data, isLoading } = useQuery({
    queryKey: () => ['stok', page.value, search.value, kelompokFilter.value, statusFilter.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        stokApi.index({
            page: page.value,
            search: search.value || undefined,
            kelompok: kelompokFilter.value || undefined,
            status: statusFilter.value || undefined,
            sort: sortKey.value || undefined,
            order: sortOrder.value,
        }),
});

watch([search, kelompokFilter, statusFilter], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function stokNumber(value) {
    return parseFloat(value).toLocaleString('id-ID');
}

function toggleSort(key) {
    if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
    }
}

function handleExport() {
    stokApi.exportExcel({
        search: search.value || undefined,
        kelompok: kelompokFilter.value || undefined,
        status: statusFilter.value || undefined,
        sort: sortKey.value || undefined,
        order: sortOrder.value,
    });
}
</script>

<template>
    <div>
        <PageHeader title="Stok Barang" description="Posisi stok seluruh barang.">
            <template #actions>
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
            </template>
        </PageHeader>
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="search" placeholder="Cari nama/kode barang..." class="w-full sm:w-56" />
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
                        <TableHead>
                            <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-emerald-700" @click="toggleSort('kode_barang')">
                                Kode
                                <span v-if="sortKey === 'kode_barang'" class="text-[10px]">{{ sortOrder === 'asc' ? '\u25b2' : '\u25bc' }}</span>
                            </button>
                        </TableHead>
                        <TableHead>
                            <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-emerald-700" @click="toggleSort('nama_barang')">
                                Barang
                                <span v-if="sortKey === 'nama_barang'" class="text-[10px]">{{ sortOrder === 'asc' ? '\u25b2' : '\u25bc' }}</span>
                            </button>
                        </TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead class="text-right">
                            <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-emerald-700" @click="toggleSort('stok')">
                                Stok
                                <span v-if="sortKey === 'stok'" class="text-[10px]">{{ sortOrder === 'asc' ? '\u25b2' : '\u25bc' }}</span>
                            </button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="6"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="6"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow v-for="barang in data.data" v-else :key="barang.id">
                        <TableCell>{{ barang.kode_barang }}</TableCell>
                        <TableCell class="font-medium">{{ barang.nama_barang }}</TableCell>
                        <TableCell>{{ barang.jenis_barang?.nama || '-' }}</TableCell>
                        <TableCell>{{ barang.satuan }}</TableCell>
                        <TableCell class="text-right font-semibold">{{ stokNumber(barang.stok) }}</TableCell>
                        <TableCell>
                            <BaseBadge :variant="parseFloat(barang.stok) <= 0 ? 'danger' : 'success'">
                                {{ parseFloat(barang.stok) <= 0 ? 'Habis' : 'Tersedia' }}
                            </BaseBadge>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
