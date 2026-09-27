<script setup>
import { useRoute, useRouter } from 'vue-router';
import BaseBadge from '../../components/ui/BaseBadge.vue';
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
import { formatIDR, formatTanggal } from '../../lib/utils';

const route = useRoute();
const router = useRouter();

const { data, isLoading } = useQuery({
    queryKey: () => ['tagihan', route.params.clientId],
    queryFn: () => tagihanApi.show(route.params.clientId),
});
</script>

<template>
    <PageLoader v-if="isLoading || !data" />
    <div v-else>
        <div class="flex items-start justify-between gap-4">
            <PageHeader :title="data.client.nama" description="Detail hutang, piutang, dan pembayaran." />
            <BaseButton variant="outline" @click="router.push('/akuntansi/saldo-client')">Kembali</BaseButton>
        </div>

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

        <div class="mt-6 space-y-6">
            <div>
                <h2 class="mb-3 text-base font-semibold text-slate-800">Hutang</h2>
                <div class="rounded-xl border border-slate-200 bg-white">
                    <BaseTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Hutang</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead class="text-right">Total</TableHead>
                                <TableHead class="text-right">Sisa</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-if="data.hutangs.length === 0">
                                <TableCell colspan="5">
                                    <EmptyState message="Tidak ada hutang." />
                                </TableCell>
                            </TableRow>
                            <TableRow v-for="hutang in data.hutangs" v-else :key="hutang.id">
                                <TableCell class="font-medium">{{ hutang.no_hutang }}</TableCell>
                                <TableCell>{{ formatTanggal(hutang.tanggal) }}</TableCell>
                                <TableCell class="text-right">{{ formatIDR(hutang.total) }}</TableCell>
                                <TableCell class="text-right font-semibold">
                                    {{ formatIDR(hutang.sisa) }}
                                </TableCell>
                                <TableCell>
                                    <BaseBadge :variant="hutang.status === 'lunas' ? 'success' : 'warning'">
                                        {{ hutang.status }}
                                    </BaseBadge>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </BaseTable>
                </div>
            </div>

            <div>
                <h2 class="mb-3 text-base font-semibold text-slate-800">Piutang</h2>
                <div class="rounded-xl border border-slate-200 bg-white">
                    <BaseTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Piutang</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead class="text-right">Total</TableHead>
                                <TableHead class="text-right">Sisa</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-if="data.piutangs.length === 0">
                                <TableCell colspan="5">
                                    <EmptyState message="Tidak ada piutang." />
                                </TableCell>
                            </TableRow>
                            <TableRow v-for="piutang in data.piutangs" v-else :key="piutang.id">
                                <TableCell class="font-medium">{{ piutang.no_piutang }}</TableCell>
                                <TableCell>{{ formatTanggal(piutang.tanggal) }}</TableCell>
                                <TableCell class="text-right">{{ formatIDR(piutang.total) }}</TableCell>
                                <TableCell class="text-right font-semibold">
                                    {{ formatIDR(piutang.sisa) }}
                                </TableCell>
                                <TableCell>
                                    <BaseBadge :variant="piutang.status === 'lunas' ? 'success' : 'warning'">
                                        {{ piutang.status }}
                                    </BaseBadge>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </BaseTable>
                </div>
            </div>

            <div>
                <h2 class="mb-3 text-base font-semibold text-slate-800">Riwayat Pembayaran</h2>
                <div class="rounded-xl border border-slate-200 bg-white">
                    <BaseTable>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nomor</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead class="text-right">Jumlah</TableHead>
                                <TableHead>Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-if="data.riwayat.length === 0">
                                <TableCell colspan="5">
                                    <EmptyState message="Belum ada pembayaran." />
                                </TableCell>
                            </TableRow>
                            <TableRow v-for="(item, index) in data.riwayat" v-else :key="index">
                                <TableCell class="font-medium">{{ item.nomor }}</TableCell>
                                <TableCell>{{ formatTanggal(item.tanggal) }}</TableCell>
                                <TableCell>
                                    <BaseBadge :variant="item.tipe === 'hutang' ? 'warning' : 'success'">
                                        {{ item.tipe === 'hutang' ? 'Bayar Hutang' : 'Terima Piutang' }}
                                    </BaseBadge>
                                </TableCell>
                                <TableCell class="text-right">{{ formatIDR(item.jumlah) }}</TableCell>
                                <TableCell>{{ item.keterangan || '-' }}</TableCell>
                            </TableRow>
                        </TableBody>
                    </BaseTable>
                </div>
            </div>
        </div>
    </div>
</template>
