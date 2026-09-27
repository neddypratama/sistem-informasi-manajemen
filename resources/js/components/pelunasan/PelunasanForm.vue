<script setup>
import { computed, ref } from 'vue';
import BaseButton from '../ui/BaseButton.vue';
import BaseInput from '../ui/BaseInput.vue';
import BaseLabel from '../ui/BaseLabel.vue';
import BaseSearchableSelect from '../ui/BaseSearchableSelect.vue';
import BaseSelect from '../ui/BaseSelect.vue';
import BaseTable from '../ui/BaseTable.vue';
import CurrencyInput from '../ui/CurrencyInput.vue';
import EmptyState from '../ui/EmptyState.vue';
import ErrorAlert from '../ui/ErrorAlert.vue';
import PageLoader from '../ui/PageLoader.vue';
import TableBody from '../ui/TableBody.vue';
import TableCell from '../ui/TableCell.vue';
import TableHead from '../ui/TableHead.vue';
import TableHeader from '../ui/TableHeader.vue';
import TableRow from '../ui/TableRow.vue';
import { useQuery } from '../../lib/query';
import { akunApi } from '../../api';
import { apiErrorMessage, formatIDR, today } from '../../lib/utils';

const props = defineProps({
    tipe: { type: String, required: true },
    api: { type: Object, required: true },
});

const emit = defineEmits(['success', 'cancel']);

const isHutang = computed(() => props.tipe === 'hutang');

const tanggal = ref(today());
const selectedId = ref('');
const jumlah = ref(0);
const keterangan = ref('');
const akunPembayaranId = ref('');
const error = ref('');
const saving = ref(false);

const { data: kasBankData } = useQuery({
    queryKey: ['akun-kas-bank-options'],
    queryFn: akunApi.kasBankOptions,
});

const { data, isLoading, refetch } = useQuery({
    queryKey: () => ['pelunasan', props.tipe],
    queryFn: () => (isHutang.value ? props.api.hutang() : props.api.piutang()),
});

const items = computed(() => data.value?.items ?? []);

const tagihanOptions = computed(() =>
    items.value.map((item) => ({
        value: String(item.client_id),
        label: item.client,
        description: `Sisa ${formatIDR(item.sisa)} (${item.jumlah_tags} faktur)`,
    })),
);

const selected = computed(
    () => items.value.find((item) => String(item.client_id) === String(selectedId.value)) ?? null,
);

async function handleSubmit() {
    error.value = '';
    saving.value = true;

    try {
        const payload = {
            tanggal: tanggal.value,
            jumlah: jumlah.value,
            keterangan: keterangan.value || null,
            client_id: selectedId.value,
            tipe: isHutang.value ? 'hutang' : 'piutang',
            akun_pembayaran_id: akunPembayaranId.value || kasBankData.value?.[0]?.id,
        };

        if (isHutang.value) {
            await props.api.bayarHutang(payload);
        } else {
            await props.api.terimaPiutang(payload);
        }

        refetch();
        emit('success');
    } catch (e) {
        error.value = apiErrorMessage(e, 'Gagal menyimpan pembayaran.');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <PageLoader v-if="isLoading" />
    <form v-else class="space-y-6" @submit.prevent="handleSubmit">
        <ErrorAlert :message="error" />

        <div class="rounded-xl border border-slate-200 bg-white">
            <div class="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Daftar {{ isHutang ? 'Hutang' : 'Piutang' }} per Client (Digabung)
            </div>
            <div v-if="items.length === 0" class="p-4">
                <EmptyState message="Tidak ada tagihan tertunggak." />
            </div>
            <BaseTable v-else>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead class="text-right">Jumlah Faktur</TableHead>
                        <TableHead class="text-right">Total</TableHead>
                        <TableHead class="text-right">Dibayar</TableHead>
                        <TableHead class="text-right">Sisa</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow v-for="item in items" :key="item.client_id">
                        <TableCell class="font-medium">{{ item.client }}</TableCell>
                        <TableCell class="text-right">{{ item.jumlah_tags }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(item.total) }}</TableCell>
                        <TableCell class="text-right">{{ formatIDR(item.jumlah_dibayar) }}</TableCell>
                        <TableCell class="text-right font-semibold">{{ formatIDR(item.sisa) }}</TableCell>
                    </TableRow>
                </TableBody>
            </BaseTable>
        </div>

        <div v-if="items.length > 0" class="rounded-xl border border-slate-200 bg-white p-5">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <BaseLabel for="tagihan">Pilih {{ isHutang ? 'Supplier' : 'Customer' }}</BaseLabel>
                    <BaseSearchableSelect
                        id="tagihan"
                        v-model="selectedId"
                        :options="tagihanOptions"
                        placeholder="-- Pilih --"
                        search-placeholder="Cari client..."
                    />
                </div>
                <div>
                    <BaseLabel for="tanggal">Tanggal Pembayaran</BaseLabel>
                    <BaseInput id="tanggal" v-model="tanggal" type="date" />
                </div>
                <div>
                    <BaseLabel for="akun_pembayaran">Metode Pembayaran (Akun Kas & Bank)</BaseLabel>
                    <BaseSelect id="akun_pembayaran" v-model="akunPembayaranId" required>
                        <option value="">-- Pilih Akun Kas / Bank --</option>
                        <option v-for="opt in (kasBankData || [])" :key="opt.id" :value="opt.id">
                            {{ opt.kode }} - {{ opt.nama }} ({{ opt.kategori }})
                        </option>
                    </BaseSelect>
                </div>
                <div>
                    <BaseLabel for="jumlah">Jumlah</BaseLabel>
                    <CurrencyInput id="jumlah" v-model="jumlah" />
                    <p v-if="selected" class="mt-1 text-xs text-slate-400">
                        Total sisa {{ isHutang ? 'hutang' : 'piutang' }} {{ selected.client }}:
                        {{ formatIDR(selected.sisa) }} ({{ selected.jumlah_tags }} faktur)
                    </p>
                </div>
                <div>
                    <BaseLabel for="keterangan">Keterangan</BaseLabel>
                    <BaseInput id="keterangan" v-model="keterangan" />
                </div>
            </div>

            <div class="mt-4 flex justify-end gap-2">
                <BaseButton type="button" variant="outline" @click="emit('cancel')">Batal</BaseButton>
                <BaseButton type="submit" :disabled="saving || !selectedId || jumlah <= 0 || (!akunPembayaranId && !kasBankData?.[0]?.id)">
                    {{ saving ? 'Menyimpan...' : isHutang ? 'Bayar Hutang' : 'Terima Pembayaran' }}
                </BaseButton>
            </div>
        </div>
    </form>
</template>
