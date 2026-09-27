<script setup>
import { computed, ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import CardContent from '../../components/ui/CardContent.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { laporanApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, today } from '../../lib/utils';

function firstDayOfMonth() {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

const dari = ref(firstDayOfMonth());
const sampai = ref(today());

const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: () => ['laporan-laba-rugi', dari.value, sampai.value],
    queryFn: () => laporanApi.labaRugi({ dari: dari.value, sampai: sampai.value }),
    enabled: false,
});

const labaBersih = computed(() => data.value?.labaBersih ?? 0);

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

const pendapatanKelompok = computed(() => kelompokkanPerKategori(data.value?.pendapatan));
const bebanKelompok = computed(() => kelompokkanPerKategori(data.value?.beban));

function handleExport() {
    laporanApi.exportLabaRugi({
        dari: dari.value,
        sampai: sampai.value,
    });
}
</script>

<template>
    <div>
        <PageHeader
            title="Laba Rugi"
            description="Kinerja pendapatan dan beban pada periode tertentu."
        />
        <BaseCard class="mb-4">
            <CardContent class="p-4">
                <div class="flex flex-wrap items-end gap-3">
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
        <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BaseCard>
                <CardContent class="p-5">
                    <div class="mb-2 text-sm font-semibold text-slate-800">Pendapatan</div>
                    <BaseTable>
                        <TableBody>
                            <TableRow v-if="pendapatanKelompok.length === 0">
                                <TableCell>
                                    <p class="text-sm text-slate-400">Belum ada akun pendapatan.</p>
                                </TableCell>
                            </TableRow>
                            <template v-for="group in pendapatanKelompok" :key="group.kategori">
                                <TableRow>
                                    <TableCell class="bg-slate-50 py-1.5 font-semibold text-slate-700">
                                        {{ group.kategori }}
                                    </TableCell>
                                    <TableCell class="bg-slate-50" />
                                </TableRow>
                                <TableRow
                                    v-for="item in group.akunList"
                                    :key="item.akun.id"
                                >
                                    <TableCell class="pl-6">
                                        {{ item.akun.kode }} &mdash; {{ item.akun.nama }}
                                    </TableCell>
                                    <TableCell class="text-right">{{ formatIDR(item.saldo) }}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell class="pl-6 font-semibold">
                                        Subtotal {{ group.kategori }}
                                    </TableCell>
                                    <TableCell class="text-right font-semibold">
                                        {{ formatIDR(group.saldo) }}
                                    </TableCell>
                                </TableRow>
                            </template>
                            <TableRow>
                                <TableCell class="font-bold">Total Pendapatan</TableCell>
                                <TableCell class="text-right font-bold">
                                    {{ formatIDR(data?.totalPendapatan ?? 0) }}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </BaseTable>
                </CardContent>
            </BaseCard>

            <BaseCard>
                <CardContent class="p-5">
                    <div class="mb-2 text-sm font-semibold text-slate-800">Beban</div>
                    <BaseTable>
                        <TableBody>
                            <TableRow v-if="bebanKelompok.length === 0">
                                <TableCell>
                                    <p class="text-sm text-slate-400">Belum ada akun beban.</p>
                                </TableCell>
                            </TableRow>
                            <template v-for="group in bebanKelompok" :key="group.kategori">
                                <TableRow>
                                    <TableCell class="bg-slate-50 py-1.5 font-semibold text-slate-700">
                                        {{ group.kategori }}
                                    </TableCell>
                                    <TableCell class="bg-slate-50" />
                                </TableRow>
                                <TableRow v-for="item in group.akunList" :key="item.akun.id">
                                    <TableCell class="pl-6">
                                        {{ item.akun.kode }} &mdash; {{ item.akun.nama }}
                                    </TableCell>
                                    <TableCell class="text-right">{{ formatIDR(item.saldo) }}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell class="pl-6 font-semibold">
                                        Subtotal {{ group.kategori }}
                                    </TableCell>
                                    <TableCell class="text-right font-semibold">
                                        {{ formatIDR(group.saldo) }}
                                    </TableCell>
                                </TableRow>
                            </template>
                            <TableRow>
                                <TableCell class="font-bold">Total Beban</TableCell>
                                <TableCell class="text-right font-bold">
                                    {{ formatIDR(data?.totalBeban ?? 0) }}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </BaseTable>
                </CardContent>
            </BaseCard>
        </div>

        <BaseCard class="mt-4">
            <CardContent class="p-5">
                <div class="flex justify-between text-base">
                    <span
                        class="font-semibold"
                        :class="labaBersih >= 0 ? 'text-slate-800' : 'text-rose-700'"
                    >
                        {{ labaBersih >= 0 ? 'Laba Bersih' : 'Rugi Bersih' }}
                    </span>
                    <span class="text-xl font-bold text-emerald-700">
                        {{ formatIDR(Math.abs(labaBersih)) }}
                    </span>
                </div>
            </CardContent>
        </BaseCard>
    </div>
</template>
