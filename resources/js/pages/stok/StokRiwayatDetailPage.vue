<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseBadge from '../../components/ui/BaseBadge.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
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
import { formatIDR, formatTanggal } from '../../lib/utils';

const route = useRoute();
const router = useRouter();

const barangId = computed(() => Number(route.params.id));

const page = ref(1);
const tipeFilter = ref('');
const dari = ref('');
const sampai = ref('');
const urutan = ref('asc');

const TIPE_LABEL = {
    pembelian: { text: 'Pembelian', variant: 'info' },
    penjualan: { text: 'Penjualan', variant: 'success' },
    pembelian_retur: { text: 'Retur Pembelian', variant: 'danger' },
    penjualan_retur: { text: 'Retur Penjualan', variant: 'warning' },
};

const { data, isLoading, isFetching } = useQuery({
    queryKey: () => [
        'stok-riwayat-detail',
        barangId.value,
        page.value,
        tipeFilter.value,
        dari.value,
        sampai.value,
        urutan.value,
    ],
    queryFn: () =>
        stokRiwayatApi.show(barangId.value, {
            page: page.value,
            tipe: tipeFilter.value || undefined,
            dari: dari.value || undefined,
            sampai: sampai.value || undefined,
            order: urutan.value,
        }),
    enabled: () => barangId.value > 0,
});

watch([tipeFilter, dari, sampai, urutan], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

const barang = computed(() => data.value?.barang ?? null);
const rows = computed(() => data.value?.data ?? []);

function qtyNumber(value) {
    const number = parseFloat(value);
    const sign = number > 0 ? '+' : '';

    return sign + number.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

function handleExport() {
    stokRiwayatApi.exportExcel(barangId.value, {
        tipe: tipeFilter.value || undefined,
        dari: dari.value || undefined,
        sampai: sampai.value || undefined,
        order: urutan.value,
    });
}
</script>

<template>
    <div>
        <PageHeader
            :title="barang ? `Riwayat Stok — ${barang.nama_barang}` : 'Riwayat Stok'"
            :description="
                barang
                    ? `${barang.kode_barang} · Stok saat ini ${qtyNumber(barang.stok)} ${barang.satuan}`
                    : 'Mutasi stok per transaksi dengan saldo berjalan.'
            "
        >
            <template #actions>
                <div class="flex gap-2">
                    <BaseButton variant="outline" @click="router.push('/stok/riwayat')">Kembali</BaseButton>
                    <BaseButton variant="outline" :disabled="isFetching" @click="handleExport">Excel</BaseButton>
                </div>
            </template>
        </PageHeader>

        <div class="mb-4 flex flex-wrap items-end gap-3">
            <div>
                <BaseLabel for="tipe">Tipe Transaksi</BaseLabel>
                <BaseSelect id="tipe" v-model="tipeFilter" class="w-full sm:w-48">
                    <option value="">Semua Tipe</option>
                    <option value="pembelian">Pembelian</option>
                    <option value="penjualan">Penjualan</option>
                    <option value="pembelian_retur">Retur Pembelian</option>
                    <option value="penjualan_retur">Retur Penjualan</option>
                </BaseSelect>
            </div>
            <div>
                <BaseLabel for="dari">Dari Tanggal</BaseLabel>
                <BaseInput id="dari" v-model="dari" type="date" />
            </div>
            <div>
                <BaseLabel for="sampai">Sampai Tanggal</BaseLabel>
                <BaseInput id="sampai" v-model="sampai" type="date" />
            </div>
            <div>
                <BaseLabel for="urutan">Urutan</BaseLabel>
                <BaseSelect id="urutan" v-model="urutan" class="w-full sm:w-36">
                    <option value="asc">Terlama</option>
                    <option value="desc">Terbaru</option>
                </BaseSelect>
            </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead class="text-right">Qty</TableHead>
                        <TableHead class="text-right">Harga</TableHead>
                        <TableHead class="text-right">Nilai</TableHead>
                        <TableHead class="text-right">Saldo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="8"><PageLoader /></TableCell>
                    </TableRow>
                    <template v-else>
                        <TableRow v-if="data">
                            <TableCell colspan="7" class="text-right text-sm font-medium text-slate-500">
                                Saldo Awal
                            </TableCell>
                            <TableCell class="text-right font-semibold">
                                {{ qtyNumber(data.saldo_awal) }}
                            </TableCell>
                        </TableRow>
                        <TableRow v-if="!rows.length">
                            <TableCell colspan="8">
                                <EmptyState message="Belum ada transaksi untuk filter ini." />
                            </TableCell>
                        </TableRow>
                        <TableRow
                            v-for="baris in rows"
                            :key="baris.id"
                            class="cursor-pointer hover:bg-slate-50"
                            @click="router.push(`/transaksi/${baris.transaksi_id}`)"
                        >
                            <TableCell>{{ formatTanggal(baris.tanggal) }}</TableCell>
                            <TableCell class="font-medium">{{ baris.nomor }}</TableCell>
                            <TableCell>
                                <BaseBadge :variant="TIPE_LABEL[baris.tipe]?.variant">
                                    {{ baris.tipe_label }}
                                </BaseBadge>
                            </TableCell>
                            <TableCell>{{ baris.client || '-' }}</TableCell>
                            <TableCell
                                class="text-right font-semibold"
                                :class="baris.qty >= 0 ? 'text-emerald-700' : 'text-rose-700'"
                            >
                                {{ qtyNumber(baris.qty) }}
                            </TableCell>
                            <TableCell class="text-right">{{ formatIDR(baris.harga) }}</TableCell>
                            <TableCell class="text-right">{{ formatIDR(baris.subtotal) }}</TableCell>
                            <TableCell class="text-right font-semibold">{{ qtyNumber(baris.saldo) }}</TableCell>
                        </TableRow>
                        <TableRow v-if="rows.length && data">
                            <TableCell colspan="6" class="font-bold">Total Keseluruhan</TableCell>
                            <TableCell class="text-right font-bold">{{ formatIDR(data.total_nilai) }}</TableCell>
                            <TableCell />
                        </TableRow>
                    </template>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
