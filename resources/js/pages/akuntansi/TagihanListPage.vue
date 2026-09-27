<script setup>
import { useRouter } from 'vue-router';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import StatCard from '../../components/ui/StatCard.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { tagihanApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR } from '../../lib/utils';

const router = useRouter();

const { data, isLoading } = useQuery({
    queryKey: ['tagihan'],
    queryFn: tagihanApi.index,
});

function handleExport() {
    tagihanApi.exportExcel();
}
</script>

<template>
    <PageLoader v-if="isLoading || !data" />
    <div v-else>
        <PageHeader title="Saldo Per Client" description="Ringkasan hutang &amp; piutang per client.">
            <template #actions>
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
            </template>
        </PageHeader>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Total Hutang" :value="formatIDR(data.totalHutang)" />
            <StatCard
                label="Sisa Hutang"
                :value="formatIDR(data.sisaHutang)"
                value-class="text-rose-700"
            />
            <StatCard label="Total Piutang" :value="formatIDR(data.totalPiutang)" />
            <StatCard
                label="Sisa Piutang"
                :value="formatIDR(data.sisaPiutang)"
                value-class="text-emerald-700"
            />
        </div>

        <div class="mt-4 rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead class="text-right">Jml Hutang</TableHead>
                        <TableHead class="text-right">Sisa Hutang</TableHead>
                        <TableHead class="text-right">Jml Piutang</TableHead>
                        <TableHead class="text-right">Sisa Piutang</TableHead>
                        <TableHead class="text-right">Total Sisa</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="data.items.length === 0">
                        <TableCell colspan="7">
                            <EmptyState message="Belum ada tagihan." />
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="item in data.items" v-else :key="item.client_id">
                        <TableCell class="font-medium">{{ item.client }}</TableCell>
                        <TableCell class="text-right">{{ item.jumlah_hutang }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(item.sisa_hutang) }}</TableCell>
                        <TableCell class="text-right">{{ item.jumlah_piutang }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(item.sisa_piutang) }}</TableCell>
                        <TableCell class="text-right font-semibold">{{ formatIDR(item.sisa) }}</TableCell>
                        <TableCell class="text-right">
                            <BaseButton
                                variant="outline"
                                size="sm"
                                @click="router.push(`/akuntansi/saldo-client/${item.client_id}`)"
                            >
                                Detail
                            </BaseButton>
                        </TableCell>
                    </TableRow>
                    <TableRow v-if="data.items.length > 0">
                        <TableCell colspan="5" class="font-bold">Total Keseluruhan</TableCell>
                        <TableCell class="text-right font-bold">
                            {{ formatIDR(data.sisaHutang + data.sisaPiutang) }}
                        </TableCell>
                        <TableCell />
                    </TableRow>
                </TableBody>
            </BaseTable>
        </div>
    </div>
</template>
