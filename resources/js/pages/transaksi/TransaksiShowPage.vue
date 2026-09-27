<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { transaksiApi } from '../../api';
import { invalidateQueries, useMutation, useQuery } from '../../lib/query';
import { useAuthStore } from '../../stores/auth';
import { formatIDR, formatTanggal } from '../../lib/utils';

const TIPE_LABEL = {
    pembelian: 'Pembelian',
    penjualan: 'Penjualan',
    pembelian_retur: 'Retur Pembelian',
    penjualan_retur: 'Retur Penjualan',
};

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const confirmDelete = ref(false);

const { data, isLoading } = useQuery({
    queryKey: () => ['transaksi', route.params.id],
    queryFn: () => transaksiApi.show(route.params.id),
});

const transaksi = computed(() => data.value?.transaksi ?? null);
const isRetur = computed(() => Boolean(transaksi.value?.tipe_transaksi?.includes('retur')));

const backTarget = computed(() => {
    const tipe = transaksi.value?.tipe_transaksi ?? '';
    const kategori = transaksi.value?.kategori ?? '';

    if (tipe === 'pembelian_retur' || tipe === 'penjualan_retur') {
        return `/retur/${tipe === 'pembelian_retur' ? 'pembelian' : 'penjualan'}`;
    }

    if ((tipe === 'pembelian' || tipe === 'penjualan') && kategori) {
        return `/transaksi/${tipe}/${kategori}`;
    }

    return '/transaksi/riwayat';
});

const canManage = computed(() => {
    const tipe = transaksi.value?.tipe_transaksi ?? '';
    const kategori = transaksi.value?.kategori ?? '';

    if (!tipe || !kategori || isRetur.value) {
        return false;
    }

    return auth.hasPermission(`menu.${tipe}.${kategori}`);
});

const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: () => transaksiApi.destroy(route.params.id),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['transaksi'] });
        invalidateQueries({ queryKey: ['dashboard'] });
        invalidateQueries({ queryKey: ['stok'] });
        router.push(backTarget.value);
    },
});
</script>

<template>
    <PageLoader v-if="isLoading || !transaksi" />
    <div v-else>
        <div class="flex items-start justify-between gap-4">
            <PageHeader
                :title="TIPE_LABEL[transaksi.tipe_transaksi] || 'Transaksi'"
                :description="transaksi.nomor_transaksi"
            >
                <template v-if="!isRetur && canManage" #actions>
                    <BaseButton variant="outline" @click="router.push(`/transaksi/${transaksi.id}/ubah`)">
                        Ubah
                    </BaseButton>
                    <BaseButton variant="danger" @click="confirmDelete = true">Hapus</BaseButton>
                </template>
            </PageHeader>
            <BaseButton variant="outline" @click="router.push(backTarget)">Kembali</BaseButton>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div class="mb-6 flex flex-wrap justify-between gap-4">
                <div>
                    <div class="text-lg font-bold text-slate-900">{{ transaksi.nomor_transaksi }}</div>
                    <div class="text-sm text-slate-500">Dibuat oleh {{ transaksi.user || '-' }}</div>
                </div>
                <div class="text-right text-sm">
                    <div class="text-slate-500">Tanggal</div>
                    <div class="font-medium">{{ formatTanggal(transaksi.tanggal) }}</div>
                    <div class="mt-2 text-slate-500">
                        {{ transaksi.tipe_transaksi === 'pembelian' ? 'Supplier' : 'Customer' }}
                    </div>
                    <div class="font-medium">{{ transaksi.client || '-' }}</div>
                </div>
            </div>

            <div
                v-if="transaksi.keterangan"
                class="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
                {{ transaksi.keterangan }}
            </div>

            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Barang</TableHead>
                        <TableHead class="text-right">Kuantitas</TableHead>
                        <TableHead class="text-right">Harga</TableHead>
                        <TableHead class="text-right">Subtotal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="detail in transaksi.details" :key="detail.id">
                        <TableCell>{{ detail.kode_barang }}</TableCell>
                        <TableCell>{{ detail.nama_barang }}</TableCell>
                        <TableCell class="text-right">
                            {{ detail.kuantitas }} {{ detail.satuan }}
                        </TableCell>
                        <TableCell class="text-right">{{ formatIDR(detail.harga) }}</TableCell>
                        <TableCell class="text-right font-medium">
                            {{ formatIDR(detail.subtotal) }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>

            <div class="mt-4 flex justify-end">
                <div class="w-full rounded-lg bg-emerald-50 px-4 py-3 sm:w-64">
                    <div class="text-sm text-slate-500">Total</div>
                    <div class="text-xl font-bold text-emerald-700">{{ formatIDR(transaksi.total) }}</div>
                </div>
            </div>
        </div>

        <ConfirmDialog
            :open="confirmDelete"
            :loading="isDeleting"
            message="Yakin ingin menghapus transaksi ini? Stok dan jurnal akan dihapus."
            @close="confirmDelete = false"
            @confirm="remove()"
        />
    </div>
</template>
