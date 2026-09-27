<script setup>
import { computed, ref, watch } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import BaseInput from '../ui/BaseInput.vue';
import BaseLabel from '../ui/BaseLabel.vue';
import BaseSelect from '../ui/BaseSelect.vue';
import BaseSearchableSelect from '../ui/BaseSearchableSelect.vue';
import BaseTable from '../ui/BaseTable.vue';
import CurrencyInput from '../ui/CurrencyInput.vue';
import ErrorAlert from '../ui/ErrorAlert.vue';
import PageLoader from '../ui/PageLoader.vue';
import TableBody from '../ui/TableBody.vue';
import TableCell from '../ui/TableCell.vue';
import TableHead from '../ui/TableHead.vue';
import TableHeader from '../ui/TableHeader.vue';
import TableRow from '../ui/TableRow.vue';
import { returApi } from '../../api';
import { useQuery } from '../../lib/query';
import { apiErrorMessage, formatIDR, formatTanggal, today } from '../../lib/utils';

const props = defineProps({
    tipe: { type: String, required: true },
});

const emit = defineEmits(['success', 'cancel']);

const isPembelian = computed(() => props.tipe === 'pembelian');

const tanggal = ref(today());
const sumberId = ref('');
const keterangan = ref('');
const error = ref('');
const saving = ref(false);
const quantities = ref({});
const prices = ref({});

const { data, isLoading } = useQuery({
    queryKey: () => ['retur-create-data', props.tipe],
    queryFn: () => returApi.createData(props.tipe),
});

const sumbersOptions = computed(() =>
    (data.value?.sumbers ?? []).map((item) => ({
        value: String(item.id),
        label: item.nomor_transaksi,
        description: `${item.client} \u2014 ${formatTanggal(item.tanggal)}`,
    })),
);

const { data: sumber, isFetching: sumberLoading } = useQuery({
    queryKey: () => ['retur-sumber', sumberId.value],
    queryFn: () => returApi.sumberItems(sumberId.value),
    enabled: () => Boolean(sumberId.value),
});

watch(sumberId, () => {
    quantities.value = {};
    prices.value = {};
});

const items = computed(() => (sumberId.value ? sumber.value?.items ?? [] : []));

const total = computed(() =>
    items.value.reduce((sum, item) => sum + hargaOf(item) * qtyOf(item), 0),
);

function rowKey(item) {
    return item.detail_sumber_id ? `detail_${item.detail_sumber_id}` : `barang_${item.barang_id}`;
}

function hargaOf(item) {
    return parseFloat(prices.value[rowKey(item)] ?? item.harga) || 0;
}

function qtyOf(item) {
    return parseFloat(quantities.value[rowKey(item)]) || 0;
}

async function handleSubmit() {
    error.value = '';

    const payloadItems = items.value
        .filter((item) => qtyOf(item) > 0)
        .map((item) => ({
            detail_sumber_id: item.detail_sumber_id ?? null,
            barang_id: item.barang_id,
            kuantitas: qtyOf(item),
            harga: hargaOf(item),
        }));

    if (payloadItems.length === 0) {
        error.value = 'Minimal satu barang dengan kuantitas harus diisi.';

        return;
    }

    saving.value = true;

    try {
        await returApi.store({
            tanggal: tanggal.value,
            tipe_transaksi: isPembelian.value ? 'pembelian_retur' : 'penjualan_retur',
            sumber_id: sumberId.value,
            keterangan: keterangan.value || null,
            items: payloadItems,
        });

        emit('success');
    } catch (e) {
        error.value = apiErrorMessage(e, 'Terjadi kesalahan saat menyimpan retur.');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <PageLoader v-if="isLoading" />
    <form v-else class="space-y-6" @submit.prevent="handleSubmit">
        <ErrorAlert :message="error" />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
                <BaseLabel for="tanggal">Tanggal Retur</BaseLabel>
                <BaseInput id="tanggal" v-model="tanggal" type="date" />
            </div>
            <div>
                <BaseLabel for="sumber">
                    Transaksi {{ isPembelian ? 'Pembelian' : 'Penjualan' }} Sumber
                </BaseLabel>
                <BaseSearchableSelect
                    id="sumber"
                    v-model="sumberId"
                    :options="sumbersOptions"
                    placeholder="-- Pilih --"
                    search-placeholder="Cari nomor/client..."
                />
            </div>
            <div>
                <BaseLabel for="keterangan">Keterangan</BaseLabel>
                <BaseInput id="keterangan" v-model="keterangan" />
            </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <div class="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Barang yang dapat diretur
            </div>
            <PageLoader v-if="sumberLoading" />
            <div v-else-if="!sumberId" class="px-4 py-8 text-center text-sm text-slate-400">
                Pilih transaksi sumber untuk menampilkan barang.
            </div>
            <div v-else-if="items.length === 0" class="px-4 py-8 text-center text-sm text-slate-400">
                Tidak ada barang yang dapat diretur pada transaksi ini.
            </div>
            <BaseTable v-else>
                <TableHeader>
                    <TableRow class="hidden sm:table-row">
                        <TableHead>Barang</TableHead>
                        <TableHead class="text-right">Tersedia</TableHead>
                        <TableHead class="w-28">Kuantitas</TableHead>
                        <TableHead class="w-44">Harga</TableHead>
                        <TableHead class="text-right">Subtotal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow
                        v-for="item in items"
                        :key="rowKey(item)"
                        class="block border-b border-slate-200 p-3 sm:table-row sm:border-b-slate-100 sm:p-0"
                    >
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Barang
                            </span>
                            <div class="font-medium">{{ item.nama_barang }}</div>
                            <div class="text-xs text-slate-400">{{ item.kode_barang }}</div>
                        </TableCell>
                        <TableCell class="block sm:table-cell sm:text-right">
                            <div class="flex items-center justify-between sm:block">
                                <span class="text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                    Tersedia
                                </span>
                                <span>{{ item.qty_available }}</span>
                            </div>
                        </TableCell>
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Kuantitas
                            </span>
                            <BaseInput
                                :model-value="quantities[rowKey(item)] ?? ''"
                                type="number"
                                min="0"
                                :max="item.qty_available"
                                @update:model-value="quantities[rowKey(item)] = $event"
                            />
                        </TableCell>
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Harga
                            </span>
                            <CurrencyInput
                                :model-value="hargaOf(item)"
                                @update:model-value="prices[rowKey(item)] = $event"
                            />
                        </TableCell>
                        <TableCell class="block font-medium sm:table-cell sm:text-right">
                            <div class="flex items-center justify-between sm:block">
                                <span class="text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                    Subtotal
                                </span>
                                <span>{{ formatIDR(hargaOf(item) * qtyOf(item)) }}</span>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <div class="flex justify-end border-t border-slate-200 px-4 py-3">
                <div class="text-sm text-slate-600">
                    Total Retur:
                    <span class="text-lg font-bold text-emerald-700">{{ formatIDR(total) }}</span>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-2">
            <BaseButton type="button" variant="outline" @click="emit('cancel')">Batal</BaseButton>
            <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Retur' }}
            </BaseButton>
        </div>
    </form>
</template>
