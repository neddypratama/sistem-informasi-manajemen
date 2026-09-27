<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BaseBadge from '../../components/ui/BaseBadge.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { stokOpnameApi } from '../../api';
import { useQuery } from '../../lib/query';
import { formatIDR, formatTanggal } from '../../lib/utils';

const route = useRoute();

const id = computed(() => route.params.id);

const { data, isLoading } = useQuery({
    queryKey: () => ['stok-opname', 'show', id.value],
    queryFn: () => stokOpnameApi.show(id.value),
});

const opname = computed(() => data.value?.opname ?? null);
const details = computed(() => data.value?.details ?? []);

function qty(value) {
    return Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}
</script>

<template>
    <div>
        <div class="flex items-start justify-between gap-4">
            <PageHeader title="Detail Stok Opname" description="Rincian perhitungan stok fisik." />
            <BaseButton variant="outline" @click="$router.push('/stok/opname')">Kembali</BaseButton>
        </div>

        <PageLoader v-if="isLoading" />
        <div v-else-if="opname" class="space-y-6">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-400">No Opname</div>
                    <div class="mt-1 font-semibold text-slate-800">{{ opname.no_opname }}</div>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-400">Tanggal</div>
                    <div class="mt-1 font-semibold text-slate-800">{{ formatTanggal(opname.tanggal) }}</div>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-400">Status</div>
                    <div class="mt-1">
                        <BaseBadge :variant="opname.status === 'selesai' ? 'success' : 'warning'">
                            {{ opname.status }}
                        </BaseBadge>
                    </div>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-400">Dibuat Oleh</div>
                    <div class="mt-1 font-semibold text-slate-800">{{ opname.created_by || '-' }}</div>
                </div>
            </div>

            <div v-if="opname.keterangan" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {{ opname.keterangan }}
            </div>

            <div class="rounded-xl border border-slate-200 bg-white">
                <div class="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                    Rincian Selisih
                </div>
                <BaseTable>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Barang</TableHead>
                            <TableHead class="text-right">Stok Sistem</TableHead>
                            <TableHead class="text-right">Stok Fisik</TableHead>
                            <TableHead class="text-right">Selisih</TableHead>
                            <TableHead class="text-right">Harga Satuan</TableHead>
                            <TableHead class="text-right">Nilai Selisih</TableHead>
                            <TableHead>Akun</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-if="details.length === 0">
                            <TableCell colspan="7"><EmptyState message="Tidak ada selisih yang dicatat." /></TableCell>
                        </TableRow>
                        <TableRow v-for="detail in details" :key="detail.barang_id">
                            <TableCell>
                                <div class="font-medium">{{ detail.nama_barang }}</div>
                                <div class="text-xs text-slate-400">{{ detail.kode_barang }}</div>
                            </TableCell>
                            <TableCell class="text-right">{{ qty(detail.stok_sistem) }}</TableCell>
                            <TableCell class="text-right">{{ qty(detail.stok_fisik) }}</TableCell>
                            <TableCell
                                class="text-right font-semibold"
                                :class="detail.selisih > 0 ? 'text-emerald-700' : detail.selisih < 0 ? 'text-rose-700' : 'text-slate-500'"
                            >
                                {{ qty(detail.selisih) }}
                            </TableCell>
                            <TableCell class="text-right">{{ formatIDR(detail.harga_satuan) }}</TableCell>
                            <TableCell class="text-right font-semibold">{{ formatIDR(detail.nilai_selisih) }}</TableCell>
                            <TableCell>
                                <template v-if="detail.bebans.length > 0">
                                    <div v-for="beban in detail.bebans" :key="beban.id" class="text-sm text-slate-600">
                                        {{ beban.nama_beban }}
                                        <span class="text-slate-400">
                                            · {{ qty(beban.jumlah) }} = {{ formatIDR(beban.nilai) }}
                                        </span>
                                    </div>
                                </template>
                                <span v-else class="text-sm text-slate-300">-</span>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </BaseTable>
            </div>
        </div>
    </div>
</template>