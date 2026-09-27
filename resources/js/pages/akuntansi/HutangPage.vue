<script setup>
import { computed, ref, watch } from 'vue';
import BaseBadge from '../../components/ui/BaseBadge.vue';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseModal from '../../components/ui/BaseModal.vue';
import BasePagination from '../../components/ui/BasePagination.vue';
import BaseSearchableSelect from '../../components/ui/BaseSearchableSelect.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import CurrencyInput from '../../components/ui/CurrencyInput.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import ErrorAlert from '../../components/ui/ErrorAlert.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import StatCard from '../../components/ui/StatCard.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { akunApi, hutangApi } from '../../api';
import { invalidateQueries, useQuery } from '../../lib/query';
import { apiErrorMessage, formatIDR, today } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const canManage = computed(() => auth.hasPermission('menu.akuntansi.hutang'));

const page = ref(1);
const selectedClientFilter = ref('');
const search = ref('');
const statusFilter = ref('');
const sortKey = ref('tanggal');
const sortOrder = ref('desc');

const SORT_OPTIONS = [
    { value: 'tanggal', label: 'Tanggal' },
    { value: 'no_hutang', label: 'No. Hutang' },
    { value: 'total', label: 'Total' },
];

const showModal = ref(false);
const modalType = ref('tambah'); // 'tambah' | 'bayar'

// Form state
const formTanggal = ref(today());
const formClientId = ref('');
const formAmount = ref(0);
const formKeterangan = ref('');
const formAkunPembayaranId = ref('');
const formError = ref('');
const formSaving = ref(false);

// Query list & summary
const { data, isLoading, refetch } = useQuery({
    queryKey: () => ['hutang-list', { page: page.value, client_id: selectedClientFilter.value, search: search.value, status: statusFilter.value, sort: sortKey.value, order: sortOrder.value }],
    queryFn: () =>
        hutangApi.index({
            page: page.value,
            client_id: selectedClientFilter.value || undefined,
            search: search.value || undefined,
            status: statusFilter.value || undefined,
            sort: sortKey.value,
            order: sortOrder.value,
        }),
});

// Query create data options
const { data: createData } = useQuery({
    queryKey: ['hutang-create-data'],
    queryFn: hutangApi.createData,
});

const { data: kasBankOptions } = useQuery({
    queryKey: ['akun-kas-bank-options'],
    queryFn: akunApi.kasBankOptions,
});

const clientsOptions = computed(() => createData.value?.clients ?? []);
const searchableClients = computed(() =>
    clientsOptions.value.map((client) => ({
        value: String(client.id),
        label: client.nama,
        description: client.tipe || '',
    })),
);
const akunFixed = computed(() => createData.value?.akun_fixed);
const akunLawan = computed(() => createData.value?.akun_lawan);

const hutangsData = computed(() => data.value?.data?.data ?? []);
const summary = computed(() => data.value?.summary ?? { total: 0, sisa: 0, lunas: 0 });
const paginationMeta = computed(() => ({
    current_page: data.value?.data?.current_page ?? 1,
    last_page: data.value?.data?.last_page ?? 1,
    total: data.value?.data?.total ?? 0,
}));

// Client detail info for payment modal
const selectedClientSummary = computed(() => {
    if (!formClientId.value) return null;
    const clientHutangs = hutangsData.value.filter(
        (item) => String(item.client_id) === String(formClientId.value),
    );
    const sisa = clientHutangs.reduce((acc, curr) => acc + curr.sisa, 0);
    return {
        sisa,
        count: clientHutangs.filter((item) => item.sisa > 0).length,
    };
});

function openModal(type) {
    modalType.value = type;
    formTanggal.value = today();
    formClientId.value = '';
    formAmount.value = 0;
    formKeterangan.value = '';
    formAkunPembayaranId.value = kasBankOptions.value?.[0]?.id ?? '';
    formError.value = '';
    showModal.value = true;
}

function closeModal() {
    showModal.value = false;
}

watch(selectedClientFilter, () => {
    page.value = 1;
});

watch([search, statusFilter], () => {
    if (page.value !== 1) {
        page.value = 1;
    }
});

async function handleSubmitForm() {
    formError.value = '';
    formSaving.value = true;

    try {
        if (modalType.value === 'tambah') {
            await hutangApi.storeTambah({
                tanggal: formTanggal.value,
                client_id: formClientId.value,
                total: formAmount.value,
                keterangan: formKeterangan.value || null,
                akun_pembayaran_id: formAkunPembayaranId.value,
            });
        } else {
            await hutangApi.storeBayar({
                tanggal: formTanggal.value,
                client_id: formClientId.value,
                jumlah: formAmount.value,
                keterangan: formKeterangan.value || null,
                akun_pembayaran_id: formAkunPembayaranId.value,
            });
        }

        closeModal();
        refetch();
        ['jurnal', 'kas', 'tagihan', 'dashboard'].forEach((key) => {
            invalidateQueries({ queryKey: [key] });
        });
    } catch (e) {
        formError.value = apiErrorMessage(e, 'Gagal menyimpan transaksi hutang.');
    } finally {
        formSaving.value = false;
    }
}

function handleExport() {
    hutangApi.exportExcel({
        client_id: selectedClientFilter.value || undefined,
        search: search.value || undefined,
        status: statusFilter.value || undefined,
        sort: sortKey.value,
        order: sortOrder.value,
    });
}
</script>

<template>
    <PageLoader v-if="isLoading && !data" />
    <div v-else class="space-y-6">
        <PageHeader title="Transaksi Hutang" description="Kelola seluruh transaksi hutang masuk dan pembayaran hutang per client.">
            <template #actions>
                <div class="flex gap-2">
                    <BaseButton variant="outline" @click="handleExport">Excel</BaseButton>
                    <div v-if="canManage" class="flex gap-2">
                        <BaseButton variant="outline" @click="openModal('bayar')">
                            💸 Bayar Hutang
                        </BaseButton>
                        <BaseButton @click="openModal('tambah')">
                            ➕ Tambah Hutang
                        </BaseButton>
                    </div>
                </div>
            </template>
        </PageHeader>

        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Hutang" :value="formatIDR(summary.total)" />
            <StatCard label="Sudah Dibayar / Lunas" :value="formatIDR(summary.lunas)" value-class="text-emerald-700" />
            <StatCard label="Sisa Belum Lunas" :value="formatIDR(summary.sisa)" value-class="text-rose-700" />
        </div>

        <!-- Filter & Table -->
        <div class="rounded-xl border border-slate-200 bg-white">
            <div class="flex flex-wrap items-center justify-between border-b border-slate-200 p-4 gap-4">
                <div class="text-sm font-semibold text-slate-700">Daftar Transaksi Hutang</div>
                <div class="flex flex-wrap items-center gap-2">
                    <BaseInput v-model="search" placeholder="Cari no/client..." class="w-full sm:w-48" />
                    <BaseSelect v-model="statusFilter" class="w-full sm:w-36">
                        <option value="">Status: Semua</option>
                        <option value="belum_lunas">Belum Lunas</option>
                        <option value="lunas">Lunas</option>
                    </BaseSelect>
                    <BaseSelect v-model="sortKey" class="w-full sm:w-40">
                        <option v-for="opt in SORT_OPTIONS" :key="opt.value" :value="opt.value">
                            Urut: {{ opt.label }}
                        </option>
                    </BaseSelect>
                    <BaseSelect v-model="sortOrder" class="w-full sm:w-28">
                        <option value="desc">Terbaru</option>
                        <option value="asc">Terlama</option>
                    </BaseSelect>
                    <label class="text-xs font-medium text-slate-500">Filter Client:</label>
                    <BaseSearchableSelect
                        v-model="selectedClientFilter"
                        :options="searchableClients"
                        placeholder="Semua Client"
                        search-placeholder="Cari client..."
                        clearable
                        class="w-full sm:w-56"
                    />
                </div>
            </div>

            <BaseTable>
                <TableHeader>
                    <TableRow>
                        <TableHead>No. Hutang</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead class="text-right">Total</TableHead>
                        <TableHead class="text-right">Dibayar</TableHead>
                        <TableHead class="text-right">Sisa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Keterangan</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    <TableRow v-if="hutangsData.length === 0">
                        <TableCell colspan="8">
                            <EmptyState message="Belum ada transaksi hutang." />
                        </TableCell>
                    </TableRow>
                    <TableRow v-for="item in hutangsData" v-else :key="item.id">
                        <TableCell class="font-mono text-xs font-semibold text-slate-800">{{ item.no_hutang }}</TableCell>
                        <TableCell class="text-slate-600">{{ item.tanggal }}</TableCell>
                        <TableCell class="font-medium text-slate-900">{{ item.client || '-' }}</TableCell>
                        <TableCell class="text-right font-medium">{{ formatIDR(item.total) }}</TableCell>
                        <TableCell class="text-right text-emerald-700 font-medium">{{ formatIDR(item.dibayar) }}</TableCell>
                        <TableCell class="text-right font-semibold" :class="item.sisa > 0 ? 'text-rose-700' : 'text-slate-500'">
                            {{ formatIDR(item.sisa) }}
                        </TableCell>
                        <TableCell>
                            <BaseBadge :variant="item.status === 'lunas' ? 'success' : 'danger'">
                                {{ item.status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                            </BaseBadge>
                        </TableCell>
                        <TableCell class="max-w-xs truncate text-slate-500" :title="item.keterangan">
                            {{ item.keterangan || '-' }}
                        </TableCell>
                    </TableRow>
                    <TableRow v-if="hutangsData.length > 0 && data?.total_nilai !== undefined">
                        <TableCell colspan="3" class="font-bold">Total Keseluruhan</TableCell>
                        <TableCell class="text-right font-bold">{{ formatIDR(data.total_nilai) }}</TableCell>
                        <TableCell colspan="4" />
                    </TableRow>
                </TableBody>
            </BaseTable>

            <div v-if="paginationMeta.last_page > 1" class="border-t border-slate-200 p-4">
                <BasePagination
                    :paginator="data.data"
                    @change="(p) => (page = p)"
                />
            </div>
        </div>

        <!-- Modal Tambah / Bayar Hutang -->
        <BaseModal
            :open="showModal"
            :title="modalType === 'tambah' ? 'Input Tambah Hutang' : 'Input Bayar Hutang'"
            @close="closeModal"
        >
            <form class="space-y-4" @submit.prevent="handleSubmitForm">
                <ErrorAlert :message="formError" />

                <div>
                    <BaseLabel for="form-tanggal">Tanggal</BaseLabel>
                    <BaseInput id="form-tanggal" v-model="formTanggal" type="date" required />
                </div>

                <div>
                    <BaseLabel for="form-client">Client / Supplier</BaseLabel>
                    <BaseSearchableSelect
                        id="form-client"
                        v-model="formClientId"
                        :options="searchableClients"
                        placeholder="-- Pilih Client --"
                        search-placeholder="Cari client..."
                    />
                </div>

                <div>
                    <BaseLabel for="form-akun-pembayaran">Metode Pembayaran (Akun Kas & Bank)</BaseLabel>
                    <BaseSelect id="form-akun-pembayaran" v-model="formAkunPembayaranId" required>
                        <option value="">-- Pilih Akun Kas / Bank --</option>
                        <option v-for="opt in (kasBankOptions || [])" :key="opt.id" :value="opt.id">
                            {{ opt.kode }} - {{ opt.nama }} ({{ opt.kategori }})
                        </option>
                    </BaseSelect>
                </div>

                <!-- Informasi Akun Readonly -->
                <div class="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs border border-slate-200">
                    <div>
                        <span class="block font-medium text-slate-500">Akun (Readonly):</span>
                        <span class="font-semibold text-slate-800">
                            {{ akunFixed ? `${akunFixed.kode} - ${akunFixed.nama}` : 'Hutang' }}
                        </span>
                    </div>
                    <div>
                        <span class="block font-medium text-slate-500">Lawan Akun:</span>
                        <span class="font-semibold text-slate-800">
                            {{ akunLawan ? `${akunLawan.kode} - ${akunLawan.nama}` : 'Kas' }}
                        </span>
                    </div>
                </div>

                <div>
                    <BaseLabel for="form-amount">
                        {{ modalType === 'tambah' ? 'Jumlah Hutang Baru' : 'Jumlah Pembayaran' }}
                    </BaseLabel>
                    <CurrencyInput id="form-amount" v-model="formAmount" />
                    <p v-if="modalType === 'bayar' && selectedClientSummary" class="mt-1 text-xs text-slate-500">
                        Total sisa hutang client terpilih: <span class="font-semibold text-rose-600">{{ formatIDR(selectedClientSummary.sisa) }}</span>
                    </p>
                </div>

                <div>
                    <BaseLabel for="form-ket">Keterangan</BaseLabel>
                    <BaseInput id="form-ket" v-model="formKeterangan" placeholder="Catatan transaksi..." />
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <BaseButton type="button" variant="outline" @click="closeModal">Batal</BaseButton>
                    <BaseButton type="submit" :disabled="formSaving || !formClientId || !formAkunPembayaranId || formAmount <= 0">
                        {{ formSaving ? 'Menyimpan...' : modalType === 'tambah' ? 'Simpan Hutang' : 'Simpan Pembayaran' }}
                    </BaseButton>
                </div>
            </form>
        </BaseModal>
    </div>
</template>
