<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseBadge from '../../components/ui/BaseBadge.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { jurnalApi } from '../../api';
import { invalidateQueries, useMutation, useQuery } from '../../lib/query';
import { useAuthStore } from '../../stores/auth';
import { formatIDR, formatTanggal } from '../../lib/utils';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const confirmDelete = ref(false);

const { data, isLoading } = useQuery({
    queryKey: () => ['jurnal', route.params.id],
    queryFn: () => jurnalApi.show(route.params.id),
});

const jurnal = computed(() => data.value?.jurnal ?? null);
const isManual = computed(() => Boolean(jurnal.value) && !jurnal.value.journalable_id);
const canManage = computed(() => auth.hasPermission('menu.akuntansi.jurnal'));

const totalDebit = computed(
    () => jurnal.value?.details?.reduce((sum, detail) => sum + parseFloat(detail.debit), 0) ?? 0,
);
const totalKredit = computed(
    () => jurnal.value?.details?.reduce((sum, detail) => sum + parseFloat(detail.kredit), 0) ?? 0,
);
const balanced = computed(() => Math.abs(totalDebit.value - totalKredit.value) < 0.01);

const { mutate: remove, isLoading: isDeleting } = useMutation({
    mutationFn: () => jurnalApi.destroy(route.params.id),
    onSuccess: () => {
        invalidateQueries({ queryKey: ['jurnal'] });
        invalidateQueries({ queryKey: ['kas'] });
        invalidateQueries({ queryKey: ['dashboard'] });
        router.push('/akuntansi/jurnal');
    },
});
</script>

<template>
    <PageLoader v-if="isLoading || !jurnal" />
    <div v-else>
        <div class="flex items-start justify-between gap-4">
            <PageHeader title="Jurnal" :description="jurnal.nomor_jurnal">
                <template v-if="isManual && canManage" #actions>
                    <BaseButton variant="outline" @click="router.push(`/akuntansi/jurnal/${jurnal.id}/ubah`)">
                        Ubah
                    </BaseButton>
                    <BaseButton variant="danger" @click="confirmDelete = true">Hapus</BaseButton>
                </template>
            </PageHeader>
            <BaseButton variant="outline" @click="router.push('/akuntansi/jurnal')">Kembali</BaseButton>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div class="mb-6 flex flex-wrap justify-between gap-4">
                <div>
                    <div class="text-lg font-bold text-slate-900">{{ jurnal.nomor_jurnal }}</div>
                    <div class="text-sm text-slate-500">Dibuat oleh {{ jurnal.user || '-' }}</div>
                    <div v-if="jurnal.keterangan" class="mt-2 text-sm text-slate-600">
                        {{ jurnal.keterangan }}
                    </div>
                </div>
                <div class="text-right text-sm">
                    <div class="text-slate-500">Tanggal</div>
                    <div class="font-medium">{{ formatTanggal(jurnal.tanggal) }}</div>
                    <template v-if="jurnal.client">
                        <div class="mt-2 text-slate-500">Client</div>
                        <div class="font-medium">{{ jurnal.client }}</div>
                    </template>
                    <div class="mt-2">
                        <BaseBadge :variant="jurnal.journalable_id ? 'info' : 'default'">
                            {{ jurnal.journalable_id ? 'Otomatis' : 'Manual' }}
                        </BaseBadge>
                        <BaseBadge :variant="balanced ? 'success' : 'danger'" class="ml-1">
                            {{ balanced ? 'Balance' : 'Tidak Balance' }}
                        </BaseBadge>
                    </div>
                </div>
            </div>

            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Akun</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead class="text-right">Debit</TableHead>
                        <TableHead class="text-right">Kredit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="detail in jurnal.details" :key="detail.id">
                        <TableCell>{{ detail.kode }}</TableCell>
                        <TableCell>{{ detail.nama_akun }}</TableCell>
                        <TableCell>{{ detail.kategori || '-' }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(detail.debit) }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(detail.kredit) }}</TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>

            <div class="mt-4 flex justify-end">
                <div class="flex w-full flex-col gap-2 text-sm sm:w-96 sm:flex-row sm:gap-4">
                    <div class="flex-1 rounded-lg bg-slate-50 px-4 py-2">
                        <div class="text-slate-500">Total Debit</div>
                        <div class="text-lg font-semibold">{{ formatIDR(totalDebit) }}</div>
                    </div>
                    <div class="flex-1 rounded-lg bg-slate-50 px-4 py-2">
                        <div class="text-slate-500">Total Kredit</div>
                        <div class="text-lg font-semibold">{{ formatIDR(totalKredit) }}</div>
                    </div>
                </div>
            </div>
        </div>

        <ConfirmDialog
            :open="confirmDelete"
            :loading="isDeleting"
            message="Yakin ingin menghapus jurnal ini?"
            @close="confirmDelete = false"
            @confirm="remove()"
        />
    </div>
</template>
