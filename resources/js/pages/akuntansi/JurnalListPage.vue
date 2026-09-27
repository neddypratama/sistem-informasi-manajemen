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
import { jurnalApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatTanggal } from '../../lib/utils';

const SUMBER_FILTER = [
    { value: 'semua', label: 'Semua Sumber' },
    { value: 'otomatis', label: 'Otomatis' },
    { value: 'manual', label: 'Manual' },
];

const router = useRouter();

const page = ref(1);
const sumber = ref('semua');
const search = ref('');
const sortKey = ref('tanggal');
const sortOrder = ref('desc');

const SORT_OPTIONS = [
    { value: 'tanggal', label: 'Tanggal' },
    { value: 'nomor_jurnal', label: 'Nomor' },
];

const { data, isLoading } = useQuery({
    queryKey: () => ['jurnal', page.value, sumber.value, search.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        jurnalApi.index({
            page: page.value,
            sumber: sumber.value,
            search: search.value || undefined,
            sort: sortKey.value,
            order: sortOrder.value,
        }),
});

watch([sumber, search], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

function handleExport() {
    jurnalApi.exportExcel({
        sumber: sumber.value,
        search: search.value || undefined,
        sort: sortKey.value,
        order: sortOrder.value,
    });
}
</script>

<template>
    <div>
        <PageHeader title="Jurnal Umum" description="Seluruh pencatatan jurnal.">
            <template #actions>
                <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
            </template>
        </PageHeader>
        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseSelect v-model="sumber" class="w-full sm:w-44">
                <option v-for="filter in SUMBER_FILTER" :key="filter.value" :value="filter.value">
                    {{ filter.label }}
                </option>
            </BaseSelect>
            <BaseInput v-model="search" placeholder="Cari nomor/client/keterangan..." class="w-full sm:w-60" />
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
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Dibuat Oleh</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead class="text-right">Detail</TableHead>
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
                        v-for="jurnal in data.data"
                        v-else
                        :key="jurnal.id"
                        class="cursor-pointer"
                        @click="router.push(`/akuntansi/jurnal/${jurnal.id}`)"
                    >
                        <TableCell class="font-medium">{{ jurnal.nomor_jurnal }}</TableCell>
                        <TableCell>{{ formatTanggal(jurnal.tanggal) }}</TableCell>
                        <TableCell class="max-w-xs truncate">{{ jurnal.keterangan || '-' }}</TableCell>
                        <TableCell>{{ jurnal.client?.nama || '-' }}</TableCell>
                        <TableCell>{{ jurnal.user?.name || '-' }}</TableCell>
                        <TableCell>
                            <BaseBadge :variant="jurnal.journalable_id ? 'info' : 'default'">
                                {{ jurnal.journalable_id ? 'Otomatis' : 'Manual' }}
                            </BaseBadge>
                        </TableCell>
                        <TableCell class="text-right">{{ jurnal.details?.length }} baris</TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>
