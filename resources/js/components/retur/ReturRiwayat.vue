<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '../ui/BaseButton.vue';
import BaseInput from '../ui/BaseInput.vue';
import BasePagination from '../ui/BasePagination.vue';
import BaseSelect from '../ui/BaseSelect.vue';
import BaseTable from '../ui/BaseTable.vue';
import EmptyState from '../ui/EmptyState.vue';
import PageLoader from '../ui/PageLoader.vue';
import TableBody from '../ui/TableBody.vue';
import TableCell from '../ui/TableCell.vue';
import TableHead from '../ui/TableHead.vue';
import TableHeader from '../ui/TableHeader.vue';
import TableRow from '../ui/TableRow.vue';
import { returApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, formatTanggal } from '../../lib/utils';

const props = defineProps({
    tipe: { type: String, required: true },
});

const router = useRouter();

const page = ref(1);
const search = ref('');
const sortKey = ref('tanggal');
const sortOrder = ref('desc');

const SORT_OPTIONS = [
    { value: 'tanggal', label: 'Tanggal' },
    { value: 'nomor_transaksi', label: 'Nomor' },
    { value: 'total', label: 'Total' },
];

const { data, isLoading } = useQuery({
    queryKey: () => ['retur', props.tipe, page.value, search.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        returApi.index({
            page: page.value,
            tipe: props.tipe,
            search: search.value || undefined,
            sort: sortKey.value,
            order: sortOrder.value,
        }),
});

watch([() => props.tipe, search], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function openDetail(id) {
    router.push(`/transaksi/${id}`);
}
</script>

<template>
    <div>
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseInput v-model="search" placeholder="Cari nomor/client..." class="w-full sm:w-56" />
            <BaseSelect v-model="sortKey" class="w-full sm:w-40">
                <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">
                    Urut: {{ opt.label }}
                </option>
            </BaseSelect>
            <BaseSelect v-model="sortOrder" class="w-full sm:w-28">
                <option value="desc">Terbaru</option>
                <option value="asc">Terlama</option>
            </BaseSelect>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Dibuat Oleh</TableHead>
                        <TableHead class="text-right">Total</TableHead>
                        <TableHead class="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="7"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="7"><EmptyState message="Belum ada retur." /></TableCell>
                    </TableRow>
                    <TableRow
                        v-for="retur in data.data"
                        v-else
                        :key="retur.id"
                        class="cursor-pointer"
                        @click="openDetail(retur.id)"
                    >
                        <TableCell class="font-medium">{{ retur.nomor_transaksi }}</TableCell>
                        <TableCell>{{ formatTanggal(retur.tanggal) }}</TableCell>
                        <TableCell>{{ retur.returDari?.nomor_transaksi || '-' }}</TableCell>
                        <TableCell>{{ retur.client?.nama }}</TableCell>
                        <TableCell>{{ retur.user?.name || '-' }}</TableCell>
                        <TableCell class="text-right font-medium">{{ formatIDR(retur.total) }}</TableCell>
                        <TableCell class="text-right" @click.stop>
                            <BaseButton variant="outline" size="sm" @click="openDetail(retur.id)">
                                Detail
                            </BaseButton>
                        </TableCell>
                    </TableRow>
                    <TableRow v-if="!isLoading && data?.data?.length && data.total_nilai !== undefined">
                        <TableCell colspan="5" class="font-bold">Total Keseluruhan</TableCell>
                        <TableCell class="text-right font-bold">{{ formatIDR(data.total_nilai) }}</TableCell>
                        <TableCell />
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>