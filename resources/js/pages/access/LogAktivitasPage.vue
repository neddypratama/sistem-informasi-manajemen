<script setup>
import { ref, watch } from 'vue';
import { logAktivitasApi } from '../../api';
import { useQuery } from '../../lib/query';
import BaseBadge from '../../components/ui/BaseBadge.vue';
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

const page = ref(1);
const search = ref('');
const modulFilter = ref('');
const aksiFilter = ref('');
const userFilter = ref('');
const dari = ref('');
const sampai = ref('');

const { data, isLoading } = useQuery({
    queryKey: () => [
        'log-aktivitas',
        page.value,
        search.value,
        modulFilter.value,
        aksiFilter.value,
        userFilter.value,
        dari.value,
        sampai.value,
    ],
    queryFn: () =>
        logAktivitasApi.index({
            page: page.value,
            search: search.value || undefined,
            modul: modulFilter.value || undefined,
            aksi: aksiFilter.value || undefined,
            user_id: userFilter.value || undefined,
            dari: dari.value || undefined,
            sampai: sampai.value || undefined,
        }),
});

const { data: users } = useQuery({
    queryKey: ['log-aktivitas/users'],
    queryFn: logAktivitasApi.userOptions,
});

watch([search, modulFilter, aksiFilter, userFilter, dari, sampai], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

const moduls = [
    { value: 'transaksi', label: 'Transaksi' },
    { value: 'retur', label: 'Retur' },
    { value: 'hutang', label: 'Hutang' },
    { value: 'piutang', label: 'Piutang' },
    { value: 'pelunasan', label: 'Pelunasan' },
    { value: 'jurnal', label: 'Jurnal' },
    { value: 'stok_opname', label: 'Stok Opname' },
    { value: 'client', label: 'Client' },
    { value: 'barang', label: 'Barang' },
    { value: 'jenis_barang', label: 'Jenis Barang' },
    { value: 'akun', label: 'Akun' },
    { value: 'kategori', label: 'Kategori Akun' },
    { value: 'user', label: 'User' },
    { value: 'role', label: 'Role' },
    { value: 'permission', label: 'Permission' },
];

const akses = [
    { value: 'tambah', label: 'Tambah' },
    { value: 'ubah', label: 'Ubah' },
    { value: 'hapus', label: 'Hapus' },
    { value: 'bayar', label: 'Bayar' },
];

function labelModul(value) {
    return moduls.find((m) => m.value === value)?.label ?? value;
}

function aksiVariant(aksi) {
    if (aksi === 'hapus') {
        return 'danger';
    }
    if (aksi === 'ubah') {
        return 'warning';
    }
    if (aksi === 'bayar') {
        return 'info';
    }
    return 'success';
}

function formatWaktu(value) {
    if (!value) return '-';
    const d = new Date(String(value).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return String(value);
    const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
}
</script>

<template>
    <div>
        <PageHeader title="Log Aktivitas" description="Riwayat aktivitas semua pengguna." />

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput
                v-model="search"
                placeholder="Cari deskripsi / referensi..."
                class="w-full sm:w-64"
            />
            <BaseSelect v-model="modulFilter" class="w-full sm:w-44">
                <option value="">Modul: Semua</option>
                <option v-for="m in moduls" :key="m.value" :value="m.value">
                    {{ m.label }}
                </option>
            </BaseSelect>
            <BaseSelect v-model="aksiFilter" class="w-full sm:w-32">
                <option value="">Aksi: Semua</option>
                <option v-for="a in akses" :key="a.value" :value="a.value">
                    {{ a.label }}
                </option>
            </BaseSelect>
            <BaseSelect v-model="userFilter" class="w-full sm:w-44">
                <option value="">User: Semua</option>
                <option v-for="u in users ?? []" :key="u.id" :value="String(u.id)">
                    {{ u.name }}
                </option>
            </BaseSelect>
            <BaseInput v-model="dari" type="date" class="w-full sm:w-40" />
            <span class="text-slate-400">s/d</span>
            <BaseInput v-model="sampai" type="date" class="w-full sm:w-40" />
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Modul</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead class="text-right">Referensi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="6"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="6"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow v-for="log in data.data" v-else :key="log.id">
                        <TableCell class="whitespace-nowrap text-slate-500">{{ formatWaktu(log.created_at) }}</TableCell>
                        <TableCell class="font-medium">{{ log.user?.name || '-' }}</TableCell>
                        <TableCell>{{ labelModul(log.modul) }}</TableCell>
                        <TableCell>
                            <BaseBadge :variant="aksiVariant(log.aksi)">{{ log.aksi }}</BaseBadge>
                        </TableCell>
                        <TableCell>{{ log.deskripsi }}</TableCell>
                        <TableCell class="text-right font-mono text-xs text-slate-500">
                            {{ log.referensi || '-' }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>