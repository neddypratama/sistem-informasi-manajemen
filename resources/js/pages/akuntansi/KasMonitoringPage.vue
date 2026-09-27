<script setup>
import { ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { kasApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, today } from '../../lib/utils';

const tanggal = ref(today());

const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: () => ['kas', tanggal.value],
    queryFn: () => kasApi.index({ tanggal: tanggal.value }),
    enabled: false,
});

function handleExport() {
    kasApi.exportExcel({ tanggal: tanggal.value });
}
</script>

<template>
    <div>
        <PageHeader title="Monitoring Kas & Bank" description="Rekap per akun kas dan bank pada tanggal terpilih." />

        <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex flex-wrap items-end gap-3">
                <div>
                    <BaseLabel for="tanggal">Tanggal</BaseLabel>
                    <BaseInput id="tanggal" v-model="tanggal" type="date" />
                </div>
                <BaseButton :disabled="isFetching" @click="refetch()">
                    {{ isFetching ? 'Memuat...' : 'Tampilkan' }}
                </BaseButton>
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
            </div>
        </div>

        <PageLoader v-if="isLoading" />

        <div v-else-if="data" class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Akun</TableHead>
                        <TableHead class="text-right">Saldo Kemarin</TableHead>
                        <TableHead class="text-right">Pemasukan</TableHead>
                        <TableHead class="text-right">Pengeluaran</TableHead>
                        <TableHead class="text-right">Saldo Akhir</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="data.items.length === 0">
                        <TableCell colspan="5">
                            <EmptyState message="Tidak ada akun kas / bank yang aktif." />
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="item in data.items" v-else :key="item.id">
                        <TableCell>
                            <div class="font-medium">{{ item.nama }}</div>
                            <div class="text-xs text-slate-400">
                                {{ item.kode }} &middot; {{ item.kategori }}
                            </div>
                        </TableCell>
                        <TableCell class="text-right">{{ formatIDR(item.saldo_kemarin) }}</TableCell>
                        <TableCell class="text-right text-emerald-700">
                            {{ formatIDR(item.pemasukan) }}
                        </TableCell>
                        <TableCell class="text-right text-rose-700">
                            {{ formatIDR(item.pengeluaran) }}
                        </TableCell>
                        <TableCell class="text-right font-semibold">
                            {{ formatIDR(item.saldo_akhir) }}
                        </TableCell>
                    </TableRow>
                    <TableRow v-if="data.items.length > 0">
                        <TableCell class="font-bold">Total</TableCell>
                        <TableCell class="text-right font-bold">{{ formatIDR(data.total_kemarin) }}</TableCell>
                        <TableCell class="text-right font-bold text-emerald-700">
                            {{ formatIDR(data.total_masuk) }}
                        </TableCell>
                        <TableCell class="text-right font-bold text-rose-700">
                            {{ formatIDR(data.total_keluar) }}
                        </TableCell>
                        <TableCell class="text-right font-bold">{{ formatIDR(data.total_akhir) }}</TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
        </div>
    </div>
</template>