<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseButton from '../../components/ui/BaseButton.vue';
import BaseInput from '../../components/ui/BaseInput.vue';
import BaseLabel from '../../components/ui/BaseLabel.vue';
import BaseSearchableSelect from '../../components/ui/BaseSearchableSelect.vue';
import BaseSelect from '../../components/ui/BaseSelect.vue';
import BaseTable from '../../components/ui/BaseTable.vue';
import EmptyState from '../../components/ui/EmptyState.vue';
import ErrorAlert from '../../components/ui/ErrorAlert.vue';
import PageHeader from '../../components/ui/PageHeader.vue';
import PageLoader from '../../components/ui/PageLoader.vue';
import TableBody from '../../components/ui/TableBody.vue';
import TableCell from '../../components/ui/TableCell.vue';
import TableHead from '../../components/ui/TableHead.vue';
import TableHeader from '../../components/ui/TableHeader.vue';
import TableRow from '../../components/ui/TableRow.vue';
import { stokOpnameApi } from '../../api';
import { invalidateQueries, useQuery } from '../../lib/query';
import { apiErrorMessage, formatIDR, today } from '../../lib/utils';

const router = useRouter();

const tanggal = ref(today());
const keterangan = ref('');
const error = ref('');
const saving = ref(false);
const selectedBarangId = ref(null);

const rows = ref([]);

const { data, isLoading } = useQuery({
    queryKey: ['stok-opname-create-data'],
    queryFn: stokOpnameApi.createData,
});

const barangs = computed(() => data.value?.barangs ?? []);
const bebanOptions = computed(() => data.value?.beban_options ?? {});

const barangMap = computed(() => {
    const map = new Map();

    barangs.value.forEach((b) => map.set(b.barang_id, b));

    return map;
});

const barangOptions = computed(() =>
    barangs.value.map((b) => ({
        value: b.barang_id,
        label: `${b.kode_barang} - ${b.nama_barang}`,
        sublabel: `Stok: ${Number(b.stok_sistem).toLocaleString('id-ID')} ${b.satuan}`,
    })),
);

function bebanOptionsFor(barangId) {
    const allOptions = Object.values(bebanOptions.value).flat();
    const barang = barangMap.value.get(Number(barangId));

    if (!barang?.kelompok) {
        return allOptions;
    }

    return bebanOptions.value[barang.kelompok] ?? allOptions;
}

function defaultBebanIdFor(barangId) {
    const options = bebanOptionsFor(barangId);

    if (options.length === 0) {
        return null;
    }

    return options[0].id;
}

function handleAddBarang(idVal) {
    if (!idVal) {
        return;
    }

    const barang = barangMap.value.get(Number(idVal));

    if (!barang) {
        return;
    }

    rows.value.push({
        id: Date.now() + Math.random(),
        barang_id: barang.barang_id,
        beban_akun_id: defaultBebanIdFor(barang.barang_id),
        arah: 'kurang',
        jumlah: '',
    });

    selectedBarangId.value = null;
}

function handleBarangChange(row, value) {
    const idVal = Number(value);

    if (!idVal) {
        return;
    }

    row.barang_id = idVal;
    row.beban_akun_id = defaultBebanIdFor(idVal);
}

function removeRow(index) {
    rows.value.splice(index, 1);
}

function rowSubTotal(row) {
    const barang = barangMap.value.get(row.barang_id);
    const harga = Number(barang?.harga_satuan ?? 0);
    const qty = parseFloat(String(row.jumlah || 0).replace(',', '.')) || 0;

    return qty * harga;
}

const grandSubTotal = computed(() =>
    rows.value.reduce((sum, r) => sum + rowSubTotal(r), 0),
);

const barangSummaries = computed(() => {
    const summary = new Map();

    rows.value.forEach((r) => {
        if (!r.barang_id) {
            return;
        }

        const barang = barangMap.value.get(r.barang_id);

        if (!barang) {
            return;
        }

        const qty = parseFloat(String(r.jumlah || 0).replace(',', '.')) || 0;
        const signedQty = r.arah === 'tambah' ? qty : -qty;

        if (!summary.has(r.barang_id)) {
            summary.set(r.barang_id, {
                barang,
                sistem: Number(barang.stok_sistem),
                netPenyesuaian: 0,
            });
        }

        const item = summary.get(r.barang_id);

        item.netPenyesuaian += signedQty;
    });

    return Array.from(summary.values()).map((item) => ({
        ...item,
        stokSekarang: item.sistem + item.netPenyesuaian,
    }));
});

function stokSekarangOf(barangId) {
    const summary = barangSummaries.value.find((s) => s.barang.barang_id === barangId);

    if (!summary) {
        const b = barangMap.value.get(barangId);

        return b ? Number(b.stok_sistem) : 0;
    }

    return summary.stokSekarang;
}

async function handleSubmit() {
    error.value = '';

    if (rows.value.length === 0) {
        error.value = 'Minimal satu baris opname harus ditambahkan.';

        return;
    }

    const payloadItems = [];

    for (let i = 0; i < rows.value.length; i++) {
        const r = rows.value[i];

        if (!r.barang_id) {
            error.value = `Baris ke-${i + 1}: Barang belum dipilih.`;

            return;
        }

        if (!r.beban_akun_id) {
            error.value = `Baris ke-${i + 1}: Beban belum dipilih.`;

            return;
        }

        const qty = parseFloat(String(r.jumlah || 0).replace(',', '.'));

        if (isNaN(qty) || qty <= 0) {
            error.value = `Baris ke-${i + 1}: Jumlah opname harus lebih besar dari 0.`;

            return;
        }

        payloadItems.push({
            barang_id: r.barang_id,
            beban_akun_id: r.beban_akun_id,
            arah: r.arah,
            jumlah: qty,
        });
    }

    saving.value = true;

    try {
        await stokOpnameApi.store({
            tanggal: tanggal.value,
            keterangan: keterangan.value || null,
            items: payloadItems,
        });

        invalidateQueries({ queryKey: ['stok'] });
        invalidateQueries({ queryKey: ['stok-fifo'] });
        invalidateQueries({ queryKey: ['stok-opname'] });
        invalidateQueries({ queryKey: ['jurnal'] });
        invalidateQueries({ queryKey: ['dashboard'] });
        router.push('/stok/opname');
    } catch (e) {
        error.value = apiErrorMessage(e, 'Terjadi kesalahan saat menyimpan stok opname.');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div>
        <PageHeader
            title="Buat Stok Opname"
            description="Catat penyesuaian stok per barang. Pilih barang, beban, arah (berkurang/bertambah), dan jumlah."
        />
        <ErrorAlert :message="error" />

        <PageLoader v-if="isLoading" />
        <form v-else class="mt-6 space-y-6" @submit.prevent="handleSubmit">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <BaseLabel for="tanggal">Tanggal Opname</BaseLabel>
                    <BaseInput id="tanggal" v-model="tanggal" type="date" />
                </div>
                <div>
                    <BaseLabel for="keterangan">Keterangan</BaseLabel>
                    <BaseInput id="keterangan" v-model="keterangan" placeholder="Contoh: Opname akhir bulan..." />
                </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white p-4">
                <BaseLabel>Pilih Barang untuk Ditambahkan</BaseLabel>
                <div class="mt-1 flex items-center gap-3">
                    <BaseSearchableSelect
                        :model-value="selectedBarangId"
                        :options="barangOptions"
                        placeholder="Cari & pilih barang..."
                        class="w-full sm:w-96"
                        @update:model-value="handleAddBarang"
                    />
                    <span class="text-xs text-slate-400">Pilih barang untuk menambah baris opname</span>
                </div>
            </div>

            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    <span>Baris Opname</span>
                    <span class="text-xs font-normal text-slate-500">{{ rows.length }} baris ditambahkan</span>
                </div>

                <BaseTable>
                    <TableHeader>
                        <TableRow class="hidden sm:table-row">
                            <TableHead class="w-10">#</TableHead>
                            <TableHead>Barang & Stok Sistem</TableHead>
                            <TableHead>Beban</TableHead>
                            <TableHead class="w-36">Arah</TableHead>
                            <TableHead class="w-28 text-right">Jumlah</TableHead>
                            <TableHead class="text-right">Sub Total</TableHead>
                            <TableHead class="text-right">Stok Sekarang</TableHead>
                            <TableHead class="w-12 text-center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow v-if="rows.length === 0">
                            <TableCell colspan="8">
                                <EmptyState message="Belum ada barang yang dipilih. Gunakan pemilih barang di atas untuk menambahkan." />
                            </TableCell>
                        </TableRow>

                        <TableRow
                            v-for="(row, index) in rows"
                            :key="row.id"
                            class="block border-b border-slate-200 p-3 sm:table-row sm:border-b-slate-100 sm:p-0"
                        >
                            <TableCell class="hidden sm:table-cell text-slate-400 text-xs font-medium align-top pt-4">
                                {{ index + 1 }}
                            </TableCell>

                            <TableCell class="block sm:table-cell align-top">
                                <div class="flex items-center justify-between sm:hidden mb-2">
                                    <span class="text-xs font-semibold uppercase text-slate-500">
                                        Baris #{{ index + 1 }} - Barang
                                    </span>
                                    <BaseButton type="button" variant="outline" size="sm" class="text-rose-600 border-rose-200" @click="removeRow(index)">
                                        ✕ Hapus
                                    </BaseButton>
                                </div>
                                <select
                                    :value="row.barang_id"
                                    class="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    @change="handleBarangChange(row, $event.target.value)"
                                >
                                    <option v-for="b in barangs" :key="b.barang_id" :value="b.barang_id">
                                        {{ b.kode_barang }} - {{ b.nama_barang }}
                                    </option>
                                </select>
                                <div v-if="barangMap.get(row.barang_id)" class="mt-1 text-xs text-slate-500 flex items-center gap-1">
                                    <span>Stok Sistem: <strong class="text-slate-700">{{ Number(barangMap.get(row.barang_id).stok_sistem).toLocaleString('id-ID') }} {{ barangMap.get(row.barang_id).satuan }}</strong></span>
                                </div>
                            </TableCell>

                            <TableCell class="block sm:table-cell align-top">
                                <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                    Beban
                                </span>
                                <select
                                    v-model="row.beban_akun_id"
                                    class="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option v-for="opt in bebanOptionsFor(row.barang_id)" :key="opt.id" :value="opt.id">
                                        {{ opt.nama }}
                                    </option>
                                </select>
                            </TableCell>

                            <TableCell class="block sm:table-cell align-top">
                                <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                    Arah
                                </span>
                                <select
                                    v-model="row.arah"
                                    class="w-full rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500"
                                    :class="row.arah === 'tambah' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-rose-300 bg-rose-50 text-rose-700'"
                                >
                                    <option value="kurang" class="text-rose-700 font-semibold">Berkurang (-)</option>
                                    <option value="tambah" class="text-emerald-700 font-semibold">Bertambah (+)</option>
                                </select>
                            </TableCell>

                            <TableCell class="block sm:table-cell align-top">
                                <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                    Jumlah
                                </span>
                                <BaseInput
                                    v-model="row.jumlah"
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0"
                                    class="w-full text-right text-xs"
                                />
                            </TableCell>

                            <TableCell class="block sm:table-cell align-top sm:text-right font-medium text-slate-700 pt-3">
                                <div class="flex items-center justify-between sm:block">
                                    <span class="text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                        Sub Total
                                    </span>
                                    <span>{{ formatIDR(rowSubTotal(row)) }}</span>
                                </div>
                            </TableCell>

                            <TableCell class="block sm:table-cell align-top sm:text-right font-semibold text-slate-800 pt-3">
                                <div class="flex items-center justify-between sm:block">
                                    <span class="text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                        Stok Sekarang
                                    </span>
                                    <span>
                                        {{ Number(stokSekarangOf(row.barang_id)).toLocaleString('id-ID') }}
                                        <span class="text-xs font-normal text-slate-400">
                                            {{ barangMap.get(row.barang_id)?.satuan }}
                                        </span>
                                    </span>
                                </div>
                            </TableCell>

                            <TableCell class="hidden sm:table-cell text-center align-top pt-2">
                                <BaseButton type="button" variant="outline" size="sm" class="text-rose-600 border-rose-200 hover:bg-rose-50" @click="removeRow(index)">
                                    ✕
                                </BaseButton>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </BaseTable>
            </div>

            <div v-if="rows.length > 0" class="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <span class="text-sm font-semibold text-slate-700">Ringkasan Penyesuaian Stok Per Barang</span>
                    <span class="text-sm text-slate-600">
                        Total Nilai Opname: <strong class="text-slate-900 text-base">{{ formatIDR(grandSubTotal) }}</strong>
                    </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div
                        v-for="sum in barangSummaries"
                        :key="sum.barang.barang_id"
                        class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
                    >
                        <div class="font-semibold text-slate-800 text-sm">{{ sum.barang.nama_barang }}</div>
                        <div class="text-slate-500">Kode: {{ sum.barang.kode_barang }}</div>
                        <div class="flex justify-between pt-1 border-t border-slate-200 text-slate-600">
                            <span>Stok Sistem:</span>
                            <span>{{ sum.sistem.toLocaleString('id-ID') }} {{ sum.barang.satuan }}</span>
                        </div>
                        <div class="flex justify-between text-slate-600">
                            <span>Penyesuaian:</span>
                            <span :class="sum.netPenyesuaian > 0 ? 'text-emerald-700 font-semibold' : sum.netPenyesuaian < 0 ? 'text-rose-700 font-semibold' : 'text-slate-600'">
                                {{ sum.netPenyesuaian > 0 ? '+' : '' }}{{ sum.netPenyesuaian.toLocaleString('id-ID') }} {{ sum.barang.satuan }}
                            </span>
                        </div>
                        <div class="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-200">
                            <span>Stok Sekarang:</span>
                            <span>{{ sum.stokSekarang.toLocaleString('id-ID') }} {{ sum.barang.satuan }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="rows.length > 0" class="flex justify-end gap-3">
                <BaseButton type="button" variant="outline" @click="$router.push('/stok/opname')">Batal</BaseButton>
                <BaseButton type="submit" :disabled="saving">
                    {{ saving ? 'Menyimpan...' : 'Simpan Stok Opname' }}
                </BaseButton>
            </div>
        </form>
    </div>
</template>
