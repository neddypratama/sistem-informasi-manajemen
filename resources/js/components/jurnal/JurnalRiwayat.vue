<script setup>
import { refDebounced } from '@vueuse/core';
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import BaseBadge from '../ui/BaseBadge.vue';
import BaseInput from '../ui/BaseInput.vue';
import BasePagination from '../ui/BasePagination.vue';
import BaseSelect from '../ui/BaseSelect.vue';
import BaseTable from '../ui/BaseTable.vue';
import EmptyState from '../ui/EmptyState.vue';
import PageLoader from '../ui/PageLoader.vue';
import StatCard from '../ui/StatCard.vue';
import TableBody from '../ui/TableBody.vue';
import TableCell from '../ui/TableCell.vue';
import TableHead from '../ui/TableHead.vue';
import TableHeader from '../ui/TableHeader.vue';
import TableRow from '../ui/TableRow.vue';
import { akunApi, jurnalApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, formatTanggal } from '../../lib/utils';

const props = defineProps({
    jenis: { type: String, required: true },
});

const router = useRouter();

const page = ref(1);
const searchInput = ref('');
const search = refDebounced(searchInput, 300);
const sortKey = ref('tanggal');
const sortOrder = ref('desc');

const isBeban = computed(() => props.jenis === 'beban');
const isPendapatan = computed(() => props.jenis === 'pendapatan');

const { data: kategorisData } = useQuery({
    queryKey: ['kategori-options'],
    queryFn: akunApi.kategoriOptions,
});

const kategoris = computed(() => {
    const list = Array.isArray(kategorisData.value) ? kategorisData.value : [];
    return list.filter((k) => k.jenis === props.jenis);
});

const KATEGORI_FILTER = computed(() => {
    const options = [];
    if (isBeban.value) {
        options.push({ value: '', label: 'Semua Beban' });
        options.push({ value: 'tanpa_hpp', label: 'Beban (Kecuali HPP)' });
    } else if (isPendapatan.value) {
        options.push({ value: '', label: 'Semua Pendapatan' });
        options.push({ value: 'tanpa_penjualan', label: 'Pendapatan (Kecuali Penjualan Telur/Pakan/Obat/Tray)' });
    }
    kategoris.value.forEach((k) => {
        options.push({ value: String(k.id), label: k.nama });
    });
    return options;
});

const kategoriFilter = ref('');

const SORT_OPTIONS = [
    { value: 'tanggal', label: 'Tanggal' },
    { value: 'nomor_jurnal', label: 'Nomor' },
];

const { data, isLoading } = useQuery({
    queryKey: () => ['jurnal', props.jenis, page.value, search.value, kategoriFilter.value, sortKey.value, sortOrder.value],
    queryFn: () =>
        jurnalApi.index({
            page: page.value,
            jenis: props.jenis,
            search: search.value || undefined,
            kategori: kategoriFilter.value || undefined,
            sort: sortKey.value,
            order: sortOrder.value,
        }),
});

watch([() => props.jenis, search, kategoriFilter], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});
</script>

<template>
    <div>
        <div v-if="data?.total_debit !== undefined" class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Total Debit" :value="formatIDR(data?.total_debit ?? 0)" value-class="text-emerald-700" />
            <StatCard label="Total Kredit" :value="formatIDR(data?.total_kredit ?? 0)" value-class="text-blue-700" />
        </div>

        <div class="mb-4 flex flex-wrap items-center gap-3">
            <BaseSelect v-if="isBeban || isPendapatan" v-model="kategoriFilter" class="w-full sm:w-60">
                <option v-for="filter in KATEGORI_FILTER" :key="filter.value" :value="filter.value">
                    {{ filter.label }}
                </option>
            </BaseSelect>
            <BaseInput v-model="searchInput" placeholder="Cari nomor/client/keterangan..." class="w-full sm:w-60" />
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
                        <TableHead class="text-right">Total</TableHead>
                        <TableHead class="text-right">Baris</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="isLoading">
                        <TableCell colspan="8"><PageLoader /></TableCell>
                    </TableRow>
                    <TableRow v-else-if="!data?.data?.length">
                        <TableCell colspan="8"><EmptyState message="Belum ada jurnal." /></TableCell>
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
                        <TableCell class="text-right font-medium">
                            {{ formatIDR(Math.max(jurnal.total_debit ?? 0, jurnal.total_kredit ?? 0)) }}
                        </TableCell>
                        <TableCell class="text-right">{{ jurnal.details?.length }} baris</TableCell>
                    </TableRow>
                    <TableRow v-if="data?.data?.length && data?.total_debit !== undefined">
                        <TableCell colspan="6" class="font-bold">Total Debit &amp; Kredit</TableCell>
                        <TableCell colspan="2" class="text-right font-bold text-slate-900">
                            Debit: {{ formatIDR(data.total_debit) }} | Kredit: {{ formatIDR(data.total_kredit) }}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <BasePagination :paginator="data" @change="page = $event" />
        </div>
    </div>
</template>