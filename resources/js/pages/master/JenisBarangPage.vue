<script setup>
import MasterCrud from '../../components/MasterCrud.vue';
import { jenisBarangApi } from '../../api';

const columns = [
    { key: 'nama', label: 'Nama', sortable: true },
    { key: 'kelompok', label: 'Kelompok', sortable: true },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'status', label: 'Status', status: true, sortable: true },
];

const filters = [
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
];

const fields = [
    { name: 'nama', label: 'Nama Jenis Barang' },
    {
        name: 'kelompok',
        label: 'Kelompok',
        type: 'select',
        options: [
            { value: 'telur', label: 'Telur' },
            { value: 'pakan', label: 'Pakan' },
            { value: 'obat', label: 'Obat' },
            { value: 'tray', label: 'Tray' },
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
        title="Jenis Barang"
        description="Kelola kategori jenis barang."
        query-key="jenis-barang"
        :api="jenisBarangApi"
        :columns="columns"
        :fields="fields"
        :filters="filters"
        search-placeholder="Cari nama jenis barang..."
    />
</template>
