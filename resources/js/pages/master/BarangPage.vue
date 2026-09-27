<script setup>
import { computed } from 'vue';
import MasterCrud from '../../components/MasterCrud.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import { barangApi, jenisBarangApi } from '../../api';
import { useQuery } from '../../lib/query';

const columns = [
    { key: 'kode_barang', label: 'Kode', sortable: true },
    { key: 'nama_barang', label: 'Nama Barang', sortable: true },
    { key: 'jenis', label: 'Jenis', render: (_value, row) => row.jenis_barang?.nama || '-' },
    { key: 'satuan', label: 'Satuan' },
    { key: 'stok', label: 'Stok', sortable: true },
    { key: 'status', label: 'Status', status: true },
];

const filters = computed(() => [
    {
        key: 'jenis_barang_id',
        label: 'Jenis Barang',
        options: (jenisOptions.value ?? []).map((jenis) => ({ value: jenis.id, label: jenis.nama })),
    },
    {
        key: 'kelompok',
        label: 'Kelompok',
        options: [
            { value: 'telur', label: 'Telur' },
            { value: 'pakan', label: 'Pakan' },
            { value: 'obat', label: 'Obat' },
            { value: 'tray', label: 'Tray' },
        ],
    },
    {
        key: 'status',
        label: 'Status',
        options: [
            { value: 'aktif', label: 'Aktif' },
            { value: 'nonaktif', label: 'Nonaktif' },
        ],
    },
]);

const { data: jenisOptions } = useQuery({
    queryKey: ['jenis-barang-options'],
    queryFn: jenisBarangApi.options,
});

const fields = computed(() => [
    {
        name: 'jenis_barang_id',
        label: 'Jenis Barang',
        type: 'select',
        options: (jenisOptions.value ?? []).map((jenis) => ({ value: jenis.id, label: jenis.nama })),
    },
    { name: 'kode_barang', label: 'Kode Barang' },
    { name: 'nama_barang', label: 'Nama Barang' },
    { name: 'satuan', label: 'Satuan' },
    {
        name: 'status',
        label: 'Status',
        type: 'select',
        default: 'aktif',
        options: [
            { value: 'aktif', label: 'Aktif' },
            { value: 'nonaktif', label: 'Nonaktif' },
        ],
    },
]);
</script>

<template>
    <PageLoader v-if="!jenisOptions" />
    <MasterCrud
        v-else
        title="Barang"
        description="Kelola data barang."
        query-key="barang"
        :api="barangApi"
        :columns="columns"
        :fields="fields"
        :filters="filters"
        search-placeholder="Cari nama/kode barang..."
    />
</template>
