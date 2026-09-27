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
import { jurnalApi } from '../../api';
import { useQuery } from '../../lib/query';
import { apiErrorMessage, formatIDR, today } from '../../lib/utils';

const props = defineProps({
    mode: { type: String, default: 'create' },
    jurnalId: { type: [String, Number], default: null },
});

const emit = defineEmits(['success', 'cancel']);

const tanggal = ref(today());
const clientId = ref('');
const keterangan = ref('');
const items = ref([{ akun_id: '', debit: null, kredit: null }]);
const error = ref('');
const saving = ref(false);

const { data, isLoading } = useQuery({
    queryKey: () => ['jurnal-form', props.mode, props.jurnalId],
    queryFn: () => (props.mode === 'edit' ? jurnalApi.editData(props.jurnalId) : jurnalApi.createData()),
});

watch(data, (value) => {
    if (props.mode !== 'edit' || !value?.jurnal) {
        return;
    }

    const jurnal = value.jurnal;

    tanggal.value = jurnal.tanggal;
    clientId.value = jurnal.client_id ? String(jurnal.client_id) : '';
    keterangan.value = jurnal.keterangan || '';
    items.value = jurnal.details?.length
        ? jurnal.details.map((detail) => ({
            akun_id: String(detail.akun_id),
            debit: parseFloat(detail.debit),
            kredit: parseFloat(detail.kredit),
        }))
        : [{ akun_id: '', debit: null, kredit: null }];
}, { immediate: true });

const akuns = computed(() => data.value?.akuns ?? []);
const akunsOptions = computed(() =>
    akuns.value.map((akun) => ({
        value: String(akun.id),
        label: akun.nama,
        description: akun.kode,
    })),
);
const clients = computed(() => data.value?.clients ?? []);

const totalDebit = computed(() =>
    items.value.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0),
);
const totalKredit = computed(() =>
    items.value.reduce((sum, item) => sum + (parseFloat(item.kredit) || 0), 0),
);
const balanceDiff = computed(() => Math.abs(totalDebit.value - totalKredit.value));

function addItem() {
    items.value.push({ akun_id: '', debit: null, kredit: null });
}

function removeItem(index) {
    if (items.value.length === 1) {
        return;
    }

    items.value.splice(index, 1);
}

async function handleSubmit() {
    error.value = '';

    const payload = {
        tanggal: tanggal.value,
        client_id: clientId.value || null,
        keterangan: keterangan.value || null,
        items: items.value
            .filter((item) => item.akun_id)
            .map((item) => ({
                akun_id: item.akun_id,
                debit: parseFloat(item.debit) || 0,
                kredit: parseFloat(item.kredit) || 0,
            })),
    };

    if (!payload.items.length) {
        error.value = 'Minimal satu baris akun wajib diisi.';

        return;
    }

    saving.value = true;

    try {
        if (props.mode === 'edit') {
            await jurnalApi.update(props.jurnalId, payload);
        } else {
            await jurnalApi.store(payload);
        }

        emit('success');
    } catch (e) {
        error.value = apiErrorMessage(e, 'Terjadi kesalahan saat menyimpan jurnal.');
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
                <BaseLabel for="client">Client</BaseLabel>
                <BaseSearchableSelect
                    id="client"
                    v-model="clientId"
                    :options="clients"
                    label-key="nama"
                    placeholder="-- Tidak ada --"
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
                Baris Jurnal
            </div>
            <BaseTable>
                <TableHeader>
                    <TableRow class="hidden sm:table-row">
                        <TableHead>Akun</TableHead>
                        <TableHead class="w-44">Debit</TableHead>
                        <TableHead class="w-44">Kredit</TableHead>
                        <TableHead class="w-12" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow
                        v-for="(item, index) in items"
                        :key="index"
                        class="block border-b border-slate-200 p-3 sm:table-row sm:border-b-slate-100 sm:p-0"
                    >
                        <TableCell class="block sm:table-cell">
                            <div class="mb-1 flex items-center justify-between sm:hidden">
                                <span class="text-xs font-semibold uppercase text-slate-500">Akun</span>
                                <button
                                    type="button"
                                    class="text-xs font-medium text-rose-500 hover:text-rose-700 disabled:opacity-30"
                                    :disabled="items.length === 1"
                                    aria-label="Hapus"
                                    @click="removeItem(index)"
                                >
                                    &#10005; Hapus
                                </button>
                            </div>
                            <BaseSearchableSelect
                                v-model="item.akun_id"
                                :options="akunsOptions"
                                placeholder="-- Pilih --"
                                search-placeholder="Cari kode/nama akun..."
                            />
                        </TableCell>
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Debit
                            </span>
                            <CurrencyInput v-model="item.debit" />
                        </TableCell>
                        <TableCell class="block sm:table-cell">
                            <span class="mb-1 block text-xs font-semibold uppercase text-slate-500 sm:hidden">
                                Kredit
                            </span>
                            <CurrencyInput v-model="item.kredit" />
                        </TableCell>
                        <TableCell class="hidden sm:table-cell">
                            <button
                                type="button"
                                class="text-rose-500 hover:text-rose-700 disabled:opacity-30"
                                :disabled="items.length === 1"
                                aria-label="Hapus"
                                @click="removeItem(index)"
                            >
                                &#10005;
                            </button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
            <div class="flex flex-col items-stretch gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <BaseButton type="button" variant="outline" size="sm" @click="addItem">
                    + Tambah Baris
                </BaseButton>
                <div class="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div>
                        Debit:
                        <span class="text-base font-bold text-emerald-700">{{ formatIDR(totalDebit) }}</span>
                    </div>
                    <div>
                        Kredit:
                        <span class="text-base font-bold text-emerald-700">{{ formatIDR(totalKredit) }}</span>
                    </div>
                    <div v-if="balanceDiff > 0.01" class="text-rose-600">
                        Selisih {{ formatIDR(balanceDiff) }}
                    </div>
                </div>
            </div>
        </div>

        <div class="flex justify-end gap-2">
            <BaseButton type="button" variant="outline" @click="emit('cancel')">Batal</BaseButton>
            <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Menyimpan...' : 'Simpan Jurnal' }}
            </BaseButton>
        </div>
    </form>
</template>
