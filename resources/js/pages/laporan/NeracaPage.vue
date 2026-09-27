<script setup>
import { computed, ref } from 'vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import CardContent from '../../components/ui/CardContent.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import { laporanApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, today } from '../../lib/utils';

const tanggal = ref(today());

const { data, isFetching, isLoading, refetch } = useQuery({
    queryKey: () => ['laporan-neraca', tanggal.value],
    queryFn: () => laporanApi.neraca({ tanggal: tanggal.value }),
    enabled: false,
});

function akunByJenis(jenis) {
    return (data.value?.akuns ?? []).filter((akun) => akun.jenis === jenis);
}

function sumSaldo(akuns) {
    return akuns.reduce((sum, akun) => sum + parseFloat(akun.saldo), 0);
}

const asetAkuns = computed(() => akunByJenis('aset'));
const liabilitasAkuns = computed(() => akunByJenis('liabilitas'));
const totalPendapatan = computed(() => sumSaldo(akunByJenis('pendapatan')));
const totalBeban = computed(() => sumSaldo(akunByJenis('beban')));
const totalAset = computed(() => sumSaldo(asetAkuns.value));
const labaBerjalan = computed(() => totalPendapatan.value - totalBeban.value);
const totalKewajiban = computed(() => sumSaldo(liabilitasAkuns.value) + labaBerjalan.value);
const selisih = computed(() => totalAset.value - totalKewajiban.value);
const isBalance = computed(() => Math.abs(selisih.value) < 0.01);

const curah = computed(() => data.value?.diLuarNeraca ?? null);

function handleExport() {
    laporanApi.exportNeraca({ tanggal: tanggal.value });
}
</script>

<template>
    <div>
        <PageHeader title="Neraca" description="Posisi keuangan pada suatu tanggal." />
        <BaseCard class="mb-4">
            <CardContent class="p-4">
                <div class="flex flex-wrap items-end gap-3">
                    <div>
                        <BaseLabel for="tanggal">Per Tanggal</BaseLabel>
                        <BaseInput id="tanggal" v-model="tanggal" type="date" />
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
                    <div class="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">
                        Aset
                    </div>
                    <p v-if="asetAkuns.length === 0" class="text-sm text-slate-400">
                        Tidak ada akun aset.
                    </p>
                    <div
                        v-for="akun in asetAkuns"
                        v-else
                        :key="akun.id"
                        class="flex justify-between py-1 text-sm"
                    >
                        <span class="text-slate-600">{{ akun.kode }} &mdash; {{ akun.nama }}</span>
                        <span class="font-medium">{{ formatIDR(akun.saldo) }}</span>
                    </div>
                    <div
                        class="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold"
                    >
                        <span>Total Aset</span>
                        <span>{{ formatIDR(totalAset) }}</span>
                    </div>
                </CardContent>
            </BaseCard>

            <BaseCard>
                <CardContent class="p-5">
                    <div class="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">
                        Liabilitas
                    </div>
                    <p v-if="liabilitasAkuns.length === 0" class="text-sm text-slate-400">
                        Tidak ada akun liabilitas.
                    </p>
                    <div
                        v-for="akun in liabilitasAkuns"
                        v-else
                        :key="akun.id"
                        class="flex justify-between py-1 text-sm"
                    >
                        <span class="text-slate-600">{{ akun.kode }} &mdash; {{ akun.nama }}</span>
                        <span class="font-medium">{{ formatIDR(akun.saldo) }}</span>
                    </div>

                    <div class="mt-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">
                        Ekuitas (Pendapatan &minus; Beban)
                    </div>
                    <div class="pt-2">
                        <div class="flex justify-between py-1 text-sm">
                            <span class="text-slate-600">Total Pendapatan</span>
                            <span>{{ formatIDR(totalPendapatan) }}</span>
                        </div>
                        <div class="flex justify-between py-1 text-sm">
                            <span class="text-slate-600">Total Beban</span>
                            <span>{{ formatIDR(totalBeban) }}</span>
                        </div>
                        <div class="flex justify-between py-1 text-sm">
                            <span class="text-slate-600">Laba Tahun Berjalan</span>
                            <span class="font-medium">{{ formatIDR(labaBerjalan) }}</span>
                        </div>
                    </div>

                    <div
                        class="mt-3 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold"
                    >
                        <span>Total Kewajiban + Ekuitas</span>
                        <span>{{ formatIDR(totalKewajiban) }}</span>
                    </div>
                </CardContent>
            </BaseCard>
        </div>

        <!-- Selisih -->
        <BaseCard v-if="data" class="mt-4">
            <CardContent class="p-5">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-700">Selisih Neraca</span>
                    <div class="flex items-center gap-3">
                        <span class="text-sm font-medium">{{ formatIDR(selisih) }}</span>
                        <span
                            class="rounded-full px-2 py-0.5 text-xs font-semibold"
                            :class="isBalance ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                        >
                            {{ isBalance ? 'Balance' : 'Tidak Balance' }}
                        </span>
                    </div>
                </div>
            </CardContent>
        </BaseCard>

        <!-- Di luar neraca: Pakan Curah -->
        <BaseCard v-if="curah" class="mt-4">
            <CardContent class="p-5">
                <div class="mb-3 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-800">
                    Di Luar Neraca &mdash; Pakan Curah
                </div>

                <!-- Aset -->
                <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Aset</div>
                <div
                    v-for="akun in curah.aset"
                    :key="akun.id"
                    class="flex justify-between py-1 text-sm"
                >
                    <span class="text-slate-600">{{ akun.kode }} &mdash; {{ akun.nama }}</span>
                    <span class="font-medium">{{ formatIDR(akun.saldo) }}</span>
                </div>
                <div class="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
                    <span>Total Aset</span>
                    <span>{{ formatIDR(curah.totalAset) }}</span>
                </div>

                <!-- Liabilitas -->
                <div class="mb-3 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Liabilitas</div>
                <div
                    v-for="akun in curah.liabilitas"
                    :key="akun.id"
                    class="flex justify-between py-1 text-sm"
                >
                    <span class="text-slate-600">{{ akun.kode }} &mdash; {{ akun.nama }}</span>
                    <span class="font-medium">{{ formatIDR(akun.saldo) }}</span>
                </div>
                <div class="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
                    <span>Total Liabilitas</span>
                    <span>{{ formatIDR(curah.totalLiabilitas) }}</span>
                </div>

                <!-- Ekuitas -->
                <div class="mb-3 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ekuitas (Pendapatan &minus; Beban)
                </div>
                <div class="flex justify-between py-1 text-sm">
                    <span class="text-slate-600">Total Pendapatan Curah</span>
                    <span>{{ formatIDR(curah.ekuitas.pendapatan) }}</span>
                </div>
                <div class="flex justify-between py-1 text-sm">
                    <span class="text-slate-600">Total Beban (HPP) Curah</span>
                    <span>{{ formatIDR(curah.ekuitas.beban) }}</span>
                </div>
                <div class="flex justify-between py-1 text-sm">
                    <span class="text-slate-600">Laba Kotor Curah</span>
                    <span class="font-medium">{{ formatIDR(curah.ekuitas.laba) }}</span>
                </div>
                <div class="mt-1 flex justify-between border-t border-slate-200 pt-1 text-sm font-bold">
                    <span>Total Kewajiban + Ekuitas</span>
                    <span>{{ formatIDR(curah.totalKewajiban) }}</span>
                </div>

                <!-- Selisih curah -->
                <div class="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                    <span class="text-sm font-semibold text-slate-700">Selisih Curah</span>
                    <div class="flex items-center gap-3">
                        <span class="text-sm font-medium">{{ formatIDR(curah.selisih) }}</span>
                        <span
                            class="rounded-full px-2 py-0.5 text-xs font-semibold"
                            :class="Math.abs(curah.selisih) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                        >
                            {{ Math.abs(curah.selisih) < 0.01 ? 'Balance' : 'Tidak Balance' }}
                        </span>
                    </div>
                </div>
            </CardContent>
        </BaseCard>
    </div>
</template>
