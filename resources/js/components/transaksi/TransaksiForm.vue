<script setup>
import { computed, ref, watch } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import BaseInput from '../ui/BaseInput.vue';
import BaseLabel from '../ui/BaseLabel.vue';
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
import { useQuery } from '../../lib/query';
import { apiErrorMessage, formatIDR, today } from '../../lib/utils';

const props = defineProps({
    tipe: { type: String, required: true },
    kategori: { type: String, default: '' },
    mode: { type: String, default: 'create' },
    transaksiId: { type: [String, Number], default: null },
    api: { type: Object, required: true },
});

const emit = defineEmits(['success', 'cancel']);

const tanggal = ref(today());
const clientId = ref('');
const keterangan = ref('');
const items = ref([]);
const error = ref('');
const saving = ref(false);

const { data, isLoading } = useQuery({
    queryKey: () => ['transaksi-form', props.mode, props.transaksiId, props.tipe, props.kategori],
    queryFn: () =>
        props.mode === 'edit'
            ? props.api.editData(props.transaksiId)
            : props.api.createData(props.tipe, props.kategori),
});

watch(data, (value) => {
    if (props.mode !== 'edit' || !value?.transaksi) {
        return;
    }

    const transaksi = value.transaksi;

    tanggal.value = transaksi.tanggal;
    clientId.value = String(transaksi.client_id);
    keterangan.value = transaksi.keterangan || '';

    // Eloquent men-serialisasi relasi sebagai snake_case (`detail_transaksis`).
    const details = transaksi.detail_transaksis ?? transaksi.detailTransaksis ?? [];

    items.value = details.map((detail) => ({
        barang_id: String(detail.barang_id),
        kuantitas: String(detail.kuantitas),
        harga: parseFloat(detail.harga),
    }));
}, { immediate: true });

const tipeTransaksi = computed(() =>
    props.mode === 'edit' ? data.value?.transaksi?.tipe_transaksi ?? props.tipe : props.tipe,
);

const barangs = computed(() => data.value?.barangs ?? []);

const kategoriFitur = computed(() => {
    if (props.kategori) {
        return props.kategori.toLowerCase();
    }
    if (props.mode !== 'edit' || items.value.length === 0) {
        return '';
    }
    const firstItem = items.value[0];
    if (!firstItem?.barang_id) {
        return '';
    }
    const barang = barangs.value.find((b) => String(b.id) === String(firstItem.barang_id));
    const kel = barang?.jenis_barang?.kelompok ?? barang?.jenisBarang?.kelompok ?? '';

    return String(kel).toLowerCase();
});

const clientFilterRules = [
    { tipe: 'pembelian', kategori: 'telur', allowTipe: ['Peternak'] },
    { tipe: 'pembelian', kategori: 'pakan', allowTipe: ['Supplier'], supplierKeterangan: 'Supplier Pakan' },
    { tipe: 'pembelian', kategori: 'obat', allowTipe: ['Supplier'], supplierKeterangan: 'Supplier Obat' },
    { tipe: 'pembelian', kategori: 'tray', allowTipe: ['Supplier'], supplierKeterangan: 'Supplier Tray' },
    { tipe: 'penjualan', kategori: 'telur', allowTipe: ['Pedagang'] },
    { tipe: 'penjualan', kategori: 'pakan', excludeTipe: ['Pedagang'] },
    { tipe: 'penjualan', kategori: 'obat', excludeTipe: ['Pedagang'] },
    { tipe: 'penjualan', kategori: 'tray', excludeTipe: ['Pedagang'] },
];

function clientMatchesFeature(client) {
    const rule = clientFilterRules.find(
        (r) => r.tipe === tipeTransaksi.value && r.kategori === kategoriFitur.value,
    );

    if (!rule) {
        return true;
    }

    const tipeClient = client.tipe || '';
    const ket = (client.keterangan || '').trim().toLowerCase();

    if (rule.allowTipe) {
        if (!rule.allowTipe.includes(tipeClient)) {
            return false;
        }
        if (rule.supplierKeterangan) {
            return ket === rule.supplierKeterangan.toLowerCase();
        }

        return true;
    }

    if (rule.excludeTipe) {
        return !rule.excludeTipe.includes(tipeClient);
    }

    return true;
}

const clients = computed(() => {
    const list = data.value?.clients ?? [];
    const filtered = list.filter(clientMatchesFeature);

    if (props.mode === 'edit' && data.value?.transaksi?.client_id) {
        const currentId = String(data.value.transaksi.client_id);
        const exists = filtered.some((c) => String(c.id) === currentId);

        if (!exists) {
            const currentClient = list.find((c) => String(c.id) === currentId);
            if (currentClient) {
                filtered.unshift(currentClient);
            }
        }
    }

    return filtered;
});

const clientLabel = computed(() => {
    const isPembelian = tipeTransaksi.value === 'pembelian';

    if (isPembelian) {
        switch (kategoriFitur.value) {
            case 'telur': return 'Peternak';
            case 'pakan': return 'Supplier Pakan';
            case 'obat': return 'Supplier Obat';
            case 'tray': return 'Supplier Tray';
            default: return 'Supplier';
        }
    }

    if (kategoriFitur.value === 'telur') {
        return 'Customer (Pedagang)';
    }

    return 'Customer';
});

const barangsOptions = computed(() =>
    barangs.value.map((barang) => ({
        value: String(barang.id),
        label: barang.nama_barang,
        description: `${barang.kode_barang} \u2014 Stok: ${barang.stok}`,
    })),
);

const total = computed(() =>
    items.value.reduce((sum, item) => {
        const harga = parseFloat(item.harga) || 0;
        const qty = parseFloat(item.kuantitas) || 0;

        return sum + harga * qty;
    }, 0),
);

function subtotal(item) {
    return (parseFloat(item.harga) || 0) * (parseFloat(item.kuantitas) || 0);
}

function addItem() {
    items.value.push({ barang_id: '', kuantitas: '1', harga: 0 });
}

function removeItem(index) {
    items.value.splice(index, 1);
}

async function handleSubmit() {
    error.value = '';
    saving.value = true;

    try {
        const payload = {
            tanggal: tanggal.value,
            tipe_transaksi: tipeTransaksi.value,
            client_id: clientId.value,
            keterangan: keterangan.value || null,
            items: items.value.map((item) => ({
                barang_id: item.barang_id,
                kuantitas: parseFloat(item.kuantitas),
                harga: parseFloat(item.harga),
            })),
        };

        if (props.mode === 'edit') {
            await props.api.update(props.transaksiId, payload);
        } else {
            await props.api.store(payload);
        }

        emit('success');
    } catch (e) {
        error.value = apiErrorMessage(e, 'Terjadi kesalahan saat menyimpan.');
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
                <BaseLabel for="tanggal">Tanggal</BaseLabel>
                <BaseInput id="tanggal" v-model="tanggal" type="date" />
            </div>
            <div>
                <BaseLabel for="client">
                    {{ clientLabel }}
                </BaseLabel>
                <BaseSearchableSelect
                    id="client"
                    v-model="clientId"
                    :options="clients"
                    label-key="nama"
                    placeholder="-- Pilih --"
                    search-placeholder="Cari client..."
                    clearable
                />
            </div>
            <div>
                <BaseLabel for="keterangan">Keterangan</BaseLabel>
                <BaseInput id="keterangan" v-model="keterangan" />
            </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white">
            <div class="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Daftar Barang
            </div>
            <BaseTable>
                <TableHeader>
                    <TableRow class="hidden sm:table-row">
                        <TableHead>Barang</TableHead>
                        <TableHead class="w-24">Kuantitas</TableHead>
                        <TableHead class="w-44">Harga</TableHead>
                        <TableHead class="text-right">Subtotal</TableHead>
                        <TableHead class="w-12" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-if="items.length === 0">
                        <TableCell colspan="5" class="text-center text-sm text-slate-400">
                            Belum ada barang. Klik &quot;Tambah Barang&quot;.
                        </TableCell>
                    </TableRow>
                    <TableRow
                        v-for="(item, index) in items"
                        v-else
                        :key="index"
                        class="block border-b border-slate-200 p-3 sm:table-row sm:border-b-slate-100 sm:p-0"
                    >
                        <TableCell class="block sm:table-cell">
                            <div class="mb-1 flex items-center justify-between sm:hidden">
                                <span class="text-xs font-semibold uppercase text-slate-500">Barang</span>
                                <button
                                    type="button"
                                    class="text-xs font-medium text-rose-500 hover:text-rose-700"
                                    aria-label="Hapus"
                                    @click="removeItem(index)"
                                >
                                    &#10005; Hapus
                                </button>
                            </div>
                            <BaseSearchableSelect
                                v-model="item.barang_id"
                                :options="barangsOptions"
                                placeholder="-- Pilih --"
                                search-placeholder="Cari barang/kode..."
                            />
                        </TableCell>
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Kuantitas
                            </span>
                            <BaseInput v-model="item.kuantitas" type="number" min="1" step="any" />
                        </TableCell>
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Harga
                            </span>
                            <CurrencyInput v-model="item.harga" />
                        </TableCell>
                        <TableCell class="block font-medium text-slate-800 sm:table-cell sm:text-right">
                            <div class="flex items-center justify-between sm:block">
                                <span class="text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                    Subtotal
                                </span>
                                <span>{{ formatIDR(subtotal(item)) }}</span>
                            </div>
                        </TableCell>
                        <TableCell class="hidden sm:table-cell">
                            <button
                                type="button"
                                class="text-rose-500 hover:text-rose-700"
                                aria-label="Hapus"
                                @click="removeItem(index)"
                            >
                                &#10005;
                            </button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <BaseButton type="button" variant="outline" size="sm" @click="addItem">
                    + Tambah Barang
                </BaseButton>
                <div class="text-sm text-slate-600">
                    Total:
                    <span class="text-lg font-bold text-emerald-700">{{ formatIDR(total) }}</span>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-2">
            <BaseButton type="button" variant="outline" @click="emit('cancel')">Batal</BaseButton>
            <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Transaksi' }}
            </BaseButton>
        </div>
    </form>
</template>
