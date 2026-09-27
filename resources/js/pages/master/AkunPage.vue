<script setup>
import { computed } from 'vue';
import MasterCrud from '../../components/MasterCrud.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import { akunApi } from '../../api';
import { useQuery } from '../../lib/query';

const columns = [
    { key: 'kode', label: 'Kode', sortable: true },
    { key: 'nama', label: 'Nama Akun', sortable: true },
    { key: 'kategori', label: 'Kategori', render: (_value, row) => row.kategori?.nama || '-' },
    { key: 'saldo_normal', label: 'Saldo Normal' },
    { key: 'status', label: 'Status', status: true, sortable: true },
];

const filters = computed(() => [
    {
        key: 'kategori_id',
        label: 'Kategori',
        options: (kategoriOptions.value ?? []).map((kategori) => ({
            value: kategori.id,
            label: kategori.nama,
        })),
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

const { data: kategoriOptions } = useQuery({
    queryKey: ['akun-kategori-options'],
    queryFn: akunApi.kategoriOptions,
});

const fields = computed(() => [
    { name: 'kode', label: 'Kode Akun' },
    { name: 'nama', label: 'Nama Akun' },
    {
        name: 'kategori_id',
        label: 'Kategori',
        type: 'select',
        options: (kategoriOptions.value ?? []).map((kategori) => ({
            value: kategori.id,
            label: kategori.nama,
        })),
    },
    {
        name: 'saldo_normal',
        label: 'Saldo Normal',
        type: 'select',
        default: 'debit',
        options: [
            { value: 'debit', label: 'Debit' },
            { value: 'kredit', label: 'Kredit' },
        ],
    },
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
    <PageLoader v-if="!kategoriOptions" />
    <MasterCrud
        v-else
        title="Akun"
        description="Kelola bagan akun."
        query-key="akun"
        :api="akunApi"
        :columns="columns"
        :fields="fields"
        :filters="filters"
        search-placeholder="Cari nama/kode akun..."
    />
</template>
