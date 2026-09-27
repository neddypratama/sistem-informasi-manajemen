<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
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
import { stokRiwayatApi } from '../../api';
import { useQuery } from '../../lib/query';

const router = useRouter();

const page = ref(1);
const search = ref('');
const kelompokFilter = ref('');
const tipeFilter = ref('');

const { data, isLoading } = useQuery({
    queryKey: () => ['stok-riwayat', page.value, search.value, kelompokFilter.value, tipeFilter.value],
    queryFn: () =>
        stokRiwayatApi.index({
            page: page.value,
            search: search.value || undefined,
            kelompok: kelompokFilter.value || undefined,
            tipe: tipeFilter.value || undefined,
        }),
});

watch([search, kelompokFilter, tipeFilter], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function stokNumber(value) {
    return parseFloat(value).toLocaleString('id-ID');
}

function bukaRiwayat(id) {
    router.push(`/stok/riwayat/${id}`);
}
</script>

<template>
    <div>
        <PageHeader
            title="Riwayat Stok"
            description="Cari barang untuk melihat riwayat transaksi pembelian, penjualan, dan retur."
        />

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="search" placeholder="Cari nama/kode barang..." class="w-full sm:w-60" />
            <BaseSelect v-model="kelompokFilter" class="w-full sm:w-40">
                <option value="">Kelompok: Semua</option>
                <option value="telur">Telur</option>
                <option value="pakan">Pakan</option>
                <option value="obat">Obat</option>
                <option value="tray">Tray</option>
            </BaseSelect>
            <BaseSelect v-model="tipeFilter" class="w-full sm:w-44">
                <option value="">Tipe: Semua</option>
                <option value="pembelian">Pembelian</option>
                <option value="penjualan">Penjualan</option>
            </BaseSelect>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Barang</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Satuan</TableHead>
                        <TableHead class="text-right">Stok</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="7"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="7"><EmptyState /></TableCell>
                    </TableRow>
                    <TableRow
                        v-for="barang in data.data"
                        v-else
                        :key="barang.id"
                        class="cursor-pointer hover:bg-slate-50"
                        @click="bukaRiwayat(barang.id)"
                    >
                        <TableCell>{{ barang.kode_barang }}</TableCell>
                        <TableCell class="font-medium">{{ barang.nama_barang }}</TableCell>
                        <TableCell>{{ barang.jenis_barang?.nama || '-' }}</TableCell>
                        <TableCell>{{ barang.satuan }}</TableCell>
                        <TableCell class="text-right font-semibold">{{ stokNumber(barang.stok) }}</TableCell>
                        <TableCell>
                            <BaseBadge :variant="barang.status === 'aktif' ? 'success' : 'danger'">
                                {{ barang.status === 'aktif' ? 'Aktif' : 'Nonaktif' }}
                            </BaseBadge>
                        </TableCell>
                        <TableCell class="text-right" @click.stop>
                            <BaseButton variant="outline" size="sm" @click="bukaRiwayat(barang.id)">
                                Detail
                            </BaseButton>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
