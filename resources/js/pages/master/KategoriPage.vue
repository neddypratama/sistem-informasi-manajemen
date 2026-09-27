<script setup>
import MasterCrud from '../../components/MasterCrud.vue';
import { kategoriApi } from '../../api';

const columns = [
    { key: 'nama', label: 'Nama Kategori', sortable: true },
    { key: 'jenis', label: 'Jenis', sortable: true },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'status', label: 'Status', status: true, sortable: true },
];

const filters = [
    {
        key: 'jenis',
        label: 'Jenis',
        options: [
            { value: 'aset', label: 'Aset' },
            { value: 'liabilitas', label: 'Liabilitas' },
            { value: 'pendapatan', label: 'Pendapatan' },
            { value: 'beban', label: 'Beban' },
            { value: 'ekuitas', label: 'Ekuitas' },
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
];

const fields = [
    { name: 'nama', label: 'Nama Kategori' },
    {
        name: 'jenis',
        label: 'Jenis',
        type: 'select',
        default: 'aset',
        options: [
            { value: 'aset', label: 'Aset' },
            { value: 'liabilitas', label: 'Liabilitas' },
            { value: 'pendapatan', label: 'Pendapatan' },
            { value: 'beban', label: 'Beban' },
            { value: 'ekuitas', label: 'Ekuitas' },
        ],
    },
    { name: 'keterangan', label: 'Keterangan' },
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
];
</script>

<template>
    <MasterCrud
        title="Kategori Akun"
        description="Kelola kategori akun."
        query-key="kategori"
        :api="kategoriApi"
        :columns="columns"
        :fields="fields"
        :filters="filters"
        search-placeholder="Cari nama kategori..."
    />
</template>
