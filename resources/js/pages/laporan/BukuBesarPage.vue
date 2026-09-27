<script setup>
import { computed, ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseSearchableSelect from '../../components/ui/BaseSearchableSelect.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import CardContent from '../../components/ui/CardContent.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { laporanApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, formatTanggal } from '../../lib/utils';

const akunId = ref('');
const dari = ref('');
const sampai = ref('');

const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: () => ['laporan-buku-besar', akunId.value, dari.value, sampai.value],
    queryFn: () =>
        laporanApi.bukuBesar({
            akun_id: akunId.value || undefined,
            dari: dari.value || undefined,
            sampai: sampai.value || undefined,
        }),
    enabled: false,
});

const laporan = computed(() => data.value?.laporan ?? null);

function kelompokkanPerKategori(items) {
    const groups = new Map();

    for (const item of items ?? []) {
        const kategori = item.akun?.kategori ?? 'Tanpa Kategori';
        if (!groups.has(kategori)) {
            groups.set(kategori, []);
        }
        groups.get(kategori).push(item);
    }

    return [...groups.entries()]
        .map(([kategori, akunList]) => ({
            kategori,
            akunList,
            saldo: akunList.reduce((sum, item) => sum + parseFloat(item.saldo), 0),
        }))
        .sort((a, b) => a.kategori.localeCompare(b.kategori));
}

const laporanKelompok = computed(() => kelompokkanPerKategori(laporan.value));

function handleExport() {
    laporanApi.exportBukuBesar({
        akun_id: akunId.value || undefined,
        dari: dari.value || undefined,
        sampai: sampai.value || undefined,
    });
}
</script>

<template>
    <div>
        <PageHeader title="Buku Besar" description="Perkembangan saldo setiap akun." />

        <BaseCard class="mb-4">
            <CardContent class="p-4">
                <div class="flex flex-wrap items-end gap-3">
                    <div class="w-full sm:w-64">
                        <BaseLabel for="akun">Akun</BaseLabel>
                        <BaseSearchableSelect
                            id="akun"
                            v-model="akunId"
                            :options="data?.akuns ?? []"
                            label-key="nama"
                            placeholder="Semua Akun"
                            search-placeholder="Cari akun..."
                            clearable
                        />
                    </div>
                    <div>
                        <BaseLabel for="dari">Dari</BaseLabel>
                        <BaseInput id="dari" v-model="dari" type="date" />
                    </div>
                    <div>
                        <BaseLabel for="sampai">Sampai</BaseLabel>
                        <BaseInput id="sampai" v-model="sampai" type="date" />
                    </div>
                    <BaseButton :disabled="isFetching" @click="refetch()">
                        {{ isFetching ? 'Memuat...' : 'Tampilkan' }}
                    </BaseButton>
                    <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
                </div>
            </CardContent>
        </BaseCard>

        <PageLoader v-if="isLoading" />
        <EmptyState
            v-else-if="laporan?.length === 0"
            message="Belum ada posisi jurnal untuk rentang ini."
        />
        <template v-else>
            <BaseCard v-for="group in laporanKelompok" :key="group.kategori" class="mb-4">
                <CardContent class="p-4">
                    <div class="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                        <span class="text-sm font-bold text-slate-800">
                            {{ group.kategori }}
                        </span>
                        <span class="text-xs font-semibold text-slate-500">
                            Subtotal Saldo: {{ formatIDR(group.saldo) }}
                        </span>
                    </div>
                    <div v-for="item in group.akunList" :key="item.akun.id" class="mb-4 last:mb-0">
                        <div class="mb-2 flex items-center justify-between">
                            <span class="font-semibold text-slate-700">
                                {{ item.akun.kode }} &mdash; {{ item.akun.nama }}
                            </span>
                            <span class="text-sm text-slate-500">
                                Saldo: <b class="text-slate-900">{{ formatIDR(item.saldo) }}</b>
                            </span>
                        </div>
                        <BaseTable>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>No. Jurnal</TableHead>
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead class="text-right">Debit</TableHead>
                                    <TableHead class="text-right">Kredit</TableHead>
                                    <TableHead class="text-right">Saldo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-if="item.details.length === 0">
                                    <TableCell colspan="6"><EmptyState /></TableCell>
                                </TableRow>
                                <TableRow v-for="detail in item.details" v-else :key="detail.id">
                                    <TableCell>{{ formatTanggal(detail.tanggal) }}</TableCell>
                                    <TableCell>{{ detail.nomor_jurnal }}</TableCell>
                                    <TableCell>
                                        {{ detail.keterangan || '-' }}
                                        <div v-if="detail.client" class="text-xs text-slate-400">
                                            {{ detail.client }}
                                        </div>
                                    </TableCell>
                                    <TableCell class="text-right">{{ formatIDR(detail.debit) }}</TableCell>
                                    <TableCell class="text-right">{{ formatIDR(detail.kredit) }}</TableCell>
                                    <TableCell class="text-right font-medium">
                                        {{ formatIDR(detail.saldo) }}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </BaseTable>
                        <div class="mt-2 flex justify-end gap-6 text-sm">
                            <span>Debit: <b>{{ formatIDR(item.debit) }}</b></span>
                            <span>Kredit: <b>{{ formatIDR(item.kredit) }}</b></span>
                            <span>Saldo: <b>{{ formatIDR(item.saldo) }}</b></span>
                        </div>
                    </div>
                </CardContent>
            </BaseCard>
        </template>
    </div>
</template>
