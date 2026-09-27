<script setup>
import MasterCrud from '../../components/MasterCrud.vue';
import { clientApi } from '../../api';

const columns = [
    { key: 'nama', label: 'Nama', sortable: true },
    { key: 'tipe', label: 'Tipe', render: (value) => value || '-', sortable: true },
    { key: 'alamat', label: 'Alamat', sortable: true },
    { key: 'status', label: 'Status', status: true, sortable: true },
];

const filters = [
    {
        key: 'tipe',
        label: 'Tipe',
        options: [
            { value: 'Peternak', label: 'Peternak' },
            { value: 'Supplier', label: 'Supplier' },
            { value: 'Pedagang', label: 'Pedagang' },
            { value: 'Karyawan', label: 'Karyawan' },
            { value: 'Truk', label: 'Truk' },
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
    { name: 'nama', label: 'Nama Client' },
    {
        name: 'tipe',
        label: 'Tipe',
        type: 'select',
        default: 'Supplier',
        options: [
            { value: 'Peternak', label: 'Peternak' },
            { value: 'Supplier', label: 'Supplier' },
            { value: 'Pedagang', label: 'Pedagang' },
            { value: 'Karyawan', label: 'Karyawan' },
        ],
    },
    { name: 'no_telepon', label: 'No. Telepon' },
    { name: 'alamat', label: 'Alamat' },
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
        title="Client"  
        description="Kelola data supplier dan customer."
        query-key="client"
        :api="clientApi"
        :columns="columns"
        :fields="fields"
        :filters="filters"
        search-placeholder="Cari nama client..."
    />
</template>
