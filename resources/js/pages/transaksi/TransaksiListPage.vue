<script setup>
import { refDebounced } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import { transaksiApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, formatTanggal } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const canManage = computed(() => {
    if (!pageTipe.value || !pageKategori.value) {
        return false;
    }
    return auth.hasPermission(`menu.${pageTipe.value}.${pageKategori.value}`);
});

const pageTipe = computed(() => route.meta.tipe || '');
const pageKategori = computed(() => route.params.kategori || '');

const TIPE_FILTER = [
    { value: '', label: 'Semua Tipe' },
    { value: 'pembelian', label: 'Pembelian' },
    { value: 'penjualan', label: 'Penjualan' },
    { value: 'retur', label: 'Retur' },
];

const TIPE_LABEL = {
    pembelian: { text: 'Pembelian', variant: 'info' },
    penjualan: { text: 'Penjualan', variant: 'success' },
    pembelian_retur: { text: 'Retur Pembelian', variant: 'danger' },
    penjualan_retur: { text: 'Retur Penjualan', variant: 'warning' },
};

const page = ref(1);
const selectedTipeFilter = ref('');
// Input teks bebas, hasil debounce dipakai query supaya tidak tembak API tiap ketikan.
const searchInput = ref('');
const search = refDebounced(searchInput, 300);
const sortKey = ref('tanggal');
const sortOrder = ref('desc');

const SORT_OPTIONS = [
    { value: 'tanggal', label: 'Tanggal' },
    { value: 'nomor_transaksi', label: 'Nomor' },
    { value: 'total', label: 'Total' },
];

const effectiveTipe = computed(() => pageTipe.value || selectedTipeFilter.value);

const kategoriLabel = computed(() => {
    if (!pageKategori.value) return '';
    return pageKategori.value.charAt(0).toUpperCase() + pageKategori.value.slice(1);
});

const pageTitle = computed(() => {
    if (pageTipe.value === 'pembelian') return `Pembelian ${kategoriLabel.value}`;
    if (pageTipe.value === 'penjualan') return `Penjualan ${kategoriLabel.value}`;
    return 'Riwayat Transaksi';
});

const pageDescription = computed(() => {
    if (pageTipe.value === 'pembelian') return `Daftar transaksi pembelian jenis barang ${kategoriLabel.value}.`;
    if (pageTipe.value === 'penjualan') return `Daftar transaksi penjualan jenis barang ${kategoriLabel.value}.`;
    return 'Semua pembelian, penjualan, dan retur.';
});

const { data, isLoading } = useQuery({
    queryKey: () => ['transaksi', page.value, effectiveTipe.value, pageKategori.value, search.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        transaksiApi.index({
            page: page.value,
            tipe: effectiveTipe.value || undefined,
            kategori: pageKategori.value || undefined,
            search: search.value || undefined,
            sort: sortKey.value,
            order: sortOrder.value,
        }),
});

watch([pageTipe, pageKategori, selectedTipeFilter, search], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function openDetail(id) {
    router.push(`/transaksi/${id}`);
}

function handleTambah() {
    if (pageTipe.value === 'penjualan') {
        router.push(`/transaksi/penjualan/${pageKategori.value}/baru`);
    } else if (pageTipe.value === 'pembelian') {
        router.push(`/transaksi/pembelian/${pageKategori.value}/baru`);
    }
}

function handleExport() {
    transaksiApi.exportExcel({
        tipe: effectiveTipe.value || undefined,
        kategori: pageKategori.value || undefined,
        search: searchInput.value || undefined,
        sort: sortKey.value,
        order: sortOrder.value,
    });
}
</script>

<template>
    <div>
        <PageHeader :title="pageTitle" :description="pageDescription">
            <template #actions>
                <div class="flex gap-2">
                    <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
                    <div v-if="canManage && pageTipe && pageKategori" class="flex gap-2">
                        <BaseButton @click="handleTambah">
                            ➕ Tambah {{ pageTitle }}
                        </BaseButton>
                    </div>
                </div>
            </template>
        </PageHeader>

        <div v-if="!pageTipe" class="mb-4 flex flex-wrap gap-3">
            <BaseSelect v-model="selectedTipeFilter" class="w-full sm:w-44">
                <option v-for="filter in TIPE_FILTER" :key="filter.value" :value="filter.value">
                    {{ filter.label }}
                </option>
            </BaseSelect>
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="searchInput" placeholder="Cari nomor/client/nama barang..." class="w-full sm:w-56" />
            <BaseSelect v-model="sortKey" class="w-full sm:w-40">
                <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">
                    Urut: {{ opt.label }}
                </option>
            </BaseSelect>
            <BaseSelect v-model="sortOrder" class="w-full sm:w-28">
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
            </BaseSelect>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead v-if="!pageTipe">Tipe</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Dibuat Oleh</TableHead>
                        <TableHead class="text-right">Total</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell :colspan="pageTipe ? 6 : 7"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell :colspan="pageTipe ? 6 : 7">
                            <EmptyState message="Belum ada transaksi." />
                        </TableCell>
                    </TableRow>
                    <TableRow
                        v-for="transaksi in data.data"
                        v-else
                        :key="transaksi.id"
                        class="cursor-pointer"
                        @click="openDetail(transaksi.id)"
                    >
                        <TableCell class="font-medium">{{ transaksi.nomor_transaksi }}</TableCell>
                        <TableCell>{{ formatTanggal(transaksi.tanggal) }}</TableCell>
                        <TableCell v-if="!pageTipe">
                            <BaseBadge :variant="TIPE_LABEL[transaksi.tipe_transaksi]?.variant">
                                {{ TIPE_LABEL[transaksi.tipe_transaksi]?.text || transaksi.tipe_transaksi }}
                            </BaseBadge>
                        </TableCell>
                        <TableCell>{{ transaksi.client?.nama }}</TableCell>
                        <TableCell>{{ transaksi.user?.name || '-' }}</TableCell>
                        <TableCell class="text-right font-medium">
                            {{ formatIDR(transaksi.total) }}
                        </TableCell>
                        <TableCell class="text-right" @click.stop>
                            <BaseButton variant="outline" size="sm" @click="openDetail(transaksi.id)">
                                Detail
                            </BaseButton>
                        </TableCell>
                    </TableRow>
                    <TableRow v-if="!isLoading && data?.data?.length && data.total_nilai !== undefined">
                        <TableCell class="font-bold" :colspan="pageTipe ? 4 : 5">Total Keseluruhan</TableCell>
                        <TableCell class="text-right font-bold">{{ formatIDR(data.total_nilai) }}</TableCell>
                        <TableCell />
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
