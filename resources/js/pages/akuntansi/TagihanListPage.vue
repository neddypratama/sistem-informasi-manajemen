<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
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
const search = ref('');

const { data, isLoading } = useQuery({
    queryKey: computed(() => ['tagihan', { search: search.value }]),
    queryFn: () => tagihanApi.index({ search: search.value }),
});

const totalSisaNet = computed(() => {
    if (!data.value) return 0;
    return data.value.sisaPiutang - data.value.sisaHutang;
});

function handleExport() {
    tagihanApi.exportExcel({ search: search.value });
}
</script>

<template>
    <div>
        <PageHeader title="Saldo Per Client" description="Ringkasan hutang &amp; piutang per client.">
            <template #actions>
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
            </template>
        </PageHeader>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <StatCard label="Total Hutang" :value="formatIDR(data?.totalHutang ?? 0)" />
            <StatCard
                label="Sisa Hutang"
                :value="formatIDR(data?.sisaHutang ?? 0)"
                value-class="text-rose-700"
            />
            <StatCard label="Total Piutang" :value="formatIDR(data?.totalPiutang ?? 0)" />
            <StatCard
                label="Sisa Piutang"
                :value="formatIDR(data?.sisaPiutang ?? 0)"
                value-class="text-emerald-700"
            />
            <StatCard
                label="Total Sisa Net"
                :value="formatIDR(Math.abs(totalSisaNet))"
                :value-class="totalSisaNet < 0 ? 'text-rose-700' : 'text-emerald-700'"
                :description="totalSisaNet < 0 ? 'Net Hutang' : 'Net Piutang'"
            />
        </div>

        <div class="mt-4 flex items-center justify-between gap-4">
            <BaseInput
                v-model="search"
                placeholder="Cari nama client..."
                class="w-full sm:w-72"
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
                    <TableRow v-if="isLoading">
                        <TableCell colspan="7">
                            <PageLoader />
                        </TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.items?.length">
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
                        <TableCell
                            class="text-right font-semibold"
                            :class="item.sisa < 0 ? 'text-rose-600' : (item.sisa > 0 ? 'text-emerald-600' : 'text-slate-600')"
                        >
                            {{ formatIDR(Math.abs(item.sisa)) }}
                            <span class="text-xs font-normal">
                                ({{ item.sisa < 0 ? 'Hutang' : (item.sisa > 0 ? 'Piutang' : '-') }})
                            </span>
                        </TableCell>
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
                    <TableRow v-if="data?.items?.length > 0">
                        <TableCell colspan="5" class="font-bold">Total Sisa Net Keseluruhan</TableCell>
                        <TableCell
                            class="text-right font-bold"
                            :class="totalSisaNet < 0 ? 'text-rose-600' : 'text-emerald-600'"
                        >
                            {{ formatIDR(Math.abs(totalSisaNet)) }}
                            <span class="text-xs font-normal">
                                ({{ totalSisaNet < 0 ? 'Net Hutang' : 'Net Piutang' }})
                            </span>
                        </TableCell>
                        <TableCell />
                    </TableRow>
                </TableBody>
            </BaseTable>
        </div>
    </div>
</template>
